// src/llm/gemini-summarization.provider.ts
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  CandidateSummaryInput,
  CandidateSummaryResult,
  RecommendedDecision,
  SummarizationProvider,
} from "./summarization-provider.interface";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

@Injectable()
export class GeminiSummarizationProvider implements SummarizationProvider {
  private readonly logger = new Logger(GeminiSummarizationProvider.name);
  private readonly apiKey: string;
  private readonly apiUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      this.logger.warn("GEMINI_API_KEY not set, falling back to fake provider");
    }
    this.apiKey = apiKey || "";
  }

  async generateCandidateSummary(
    input: CandidateSummaryInput,
  ): Promise<CandidateSummaryResult> {
    // If no API key, fall back to fake implementation
    if (!this.apiKey) {
      return this.fakeImplementation(input);
    }

    try {
      const prompt = this.buildPrompt(input);
      const response = await this.callGeminiAPI(prompt);
      return this.parseResponse(response, input);
    } catch (error: any) {
      this.logger.error(`Gemini API call failed: ${error.message}`);
      // Fall back to fake implementation on error
      return this.fakeImplementation(input);
    }
  }

  private buildPrompt(input: CandidateSummaryInput): string {
    const documentsText = input.documents
      .map((doc, index) => `Document ${index + 1}:\n${doc}`)
      .join("\n\n");

    return `
You are an expert recruiter analyzing candidate documents. Based on the following documents, provide a structured summary.

Documents:
${documentsText}

Provide a JSON response with exactly this structure:
{
  "score": number between 0-100,
  "strengths": ["strength1", "strength2", ...],
  "concerns": ["concern1", "concern2", ...],
  "summary": "brief overall summary",
  "recommendedDecision": "advance" | "hold" | "reject"
}

Ensure the response is valid JSON only, no other text.
`;
  }

  private async callGeminiAPI(prompt: string): Promise<GeminiResponse> {
    const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Gemini API returned ${response.status}: ${await response.text()}`,
      );
    }

    return response.json();
  }

  private parseResponse(
    response: GeminiResponse,
    input: CandidateSummaryInput,
  ): CandidateSummaryResult {
    try {
      const text = response.candidates[0]?.content?.parts[0]?.text;
      if (!text) {
        throw new Error("No text in response");
      }

      // Extract JSON from response (handling potential markdown code blocks)
      const jsonMatch =
        text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;

      const parsed = JSON.parse(jsonStr);

      return {
        score: parsed.score || 50,
        strengths: parsed.strengths || ["No strengths identified"],
        concerns: parsed.concerns || ["No concerns identified"],
        summary: parsed.summary || this.generateFallbackSummary(input),
        recommendedDecision: this.validateDecision(parsed.recommendedDecision),
      };
    } catch (error: any) {
      this.logger.error(`Failed to parse Gemini response: ${error.message}`);
      return this.fakeImplementation(input);
    }
  }

  private validateDecision(decision: string): RecommendedDecision {
    if (
      decision === "advance" ||
      decision === "hold" ||
      decision === "reject"
    ) {
      return decision;
    }
    return "hold";
  }

  private generateFallbackSummary(input: CandidateSummaryInput): string {
    return `Candidate ${input.candidateId} submitted ${input.documents.length} document(s).`;
  }

  private fakeImplementation(
    input: CandidateSummaryInput,
  ): CandidateSummaryResult {
    const docCount = input.documents.length;
    return {
      score: docCount > 0 ? 72 : 40,
      strengths: ["Communicates clearly", "Relevant project exposure"],
      concerns:
        docCount > 1
          ? ["Needs deeper system design examples"]
          : ["Limited context provided"],
      summary: `Summary for candidate ${input.candidateId} using ${docCount} document(s).`,
      recommendedDecision: docCount > 0 ? "hold" : "reject",
    };
  }
}

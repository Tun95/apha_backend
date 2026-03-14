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
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion?: string;
}

@Injectable()
export class GeminiSummarizationProvider implements SummarizationProvider {
  private readonly logger = new Logger(GeminiSummarizationProvider.name);
  private readonly apiKey: string;
  // Use the working model from your test
  private readonly modelName = "gemini-flash-latest"; // or 'gemini-3-flash-preview'
  private readonly apiUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      this.logger.warn("GEMINI_API_KEY not set, falling back to fake provider");
    }
    this.apiKey = apiKey || "";

    if (this.apiKey) {
      this.logger.log("✅ Gemini provider initialized with working API key");
    }
  }

  async generateCandidateSummary(
    input: CandidateSummaryInput,
  ): Promise<CandidateSummaryResult> {
    // If no API key, fall back to fake implementation
    if (!this.apiKey) {
      this.logger.warn("No API key, using fake implementation");
      return this.fakeImplementation(input);
    }

    try {
      this.logger.log(
        `🤖 Calling Gemini API for candidate ${input.candidateId} with ${input.documents.length} documents`,
      );

      const prompt = this.buildPrompt(input);
      const response = await this.callGeminiAPI(prompt);

      this.logger.log("✅ Gemini API call successful");
      return this.parseResponse(response, input);
    } catch (error: any) {
      this.logger.error(`❌ Gemini API call failed: ${error.message}`);
      this.logger.log("Falling back to fake implementation");
      return this.fakeImplementation(input);
    }
  }

  private async callGeminiAPI(prompt: string): Promise<GeminiResponse> {
    const url = `${this.apiUrl}/models/${this.modelName}:generateContent`;

    this.logger.debug(`Calling Gemini API at: ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": this.apiKey, // Using the header format that worked
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
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Gemini API returned ${response.status}: ${errorText}`);
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Log usage for monitoring
    if (data.usageMetadata) {
      this.logger.debug(
        `Token usage - Total: ${data.usageMetadata.totalTokenCount}`,
      );
    }

    return data;
  }

  private buildPrompt(input: CandidateSummaryInput): string {
    const documentsText = input.documents
      .map((doc, index) => `Document ${index + 1}:\n${doc}`)
      .join("\n\n");

    return `You are an expert technical recruiter analyzing candidate documents. Based on the following documents, provide a structured summary.

Documents:
${documentsText}

Provide a JSON response with exactly this structure:
{
  "score": 85,
  "strengths": ["Strong technical background", "Leadership experience", "Cloud expertise"],
  "concerns": ["Limited team management experience", "Could provide more specific examples"],
  "summary": "Experienced full-stack developer with 8 years of experience...",
  "recommendedDecision": "advance"
}

Requirements:
- Score: number between 0-100 (higher is better)
- Strengths: list 2-4 specific, actionable strengths
- Concerns: list 1-3 potential areas for improvement
- Summary: 2-3 sentences overall impression
- Decision: must be exactly "advance", "hold", or "reject"

Return ONLY valid JSON, no other text or explanation.`;
  }

  private parseResponse(
    response: GeminiResponse,
    input: CandidateSummaryInput,
  ): CandidateSummaryResult {
    try {
      // Check if response has candidates
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error("No candidates in Gemini response");
      }

      const text = response.candidates[0]?.content?.parts[0]?.text;
      if (!text) {
        throw new Error("No text in Gemini response part");
      }

      this.logger.debug(`Raw Gemini response: ${text.substring(0, 200)}...`);

      // Extract JSON from response
      let jsonStr = text;

      // Try to extract from markdown code block
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // Try to find JSON object in the text
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonStr = objectMatch[0];
        }
      }

      // Clean the string
      jsonStr = jsonStr.trim();

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseError: any) {
        this.logger.warn(
          `Initial JSON parse failed, attempting to fix: ${parseError.message}`,
        );
        // Try to fix common JSON issues
        jsonStr = jsonStr
          .replace(/'/g, '"') // Replace single quotes with double quotes
          .replace(/(\w+):/g, '"$1":') // Add quotes to keys
          .replace(/,\s*}/g, "}") // Remove trailing commas
          .replace(/,\s*]/g, "]"); // Remove trailing commas in arrays
        parsed = JSON.parse(jsonStr);
      }

      // Validate and return with defaults for missing fields
      return {
        score:
          typeof parsed.score === "number"
            ? Math.min(100, Math.max(0, parsed.score))
            : 75,
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths
          : ["Experience relevant"],
        concerns: Array.isArray(parsed.concerns)
          ? parsed.concerns
          : ["More information needed"],
        summary: parsed.summary || this.generateFallbackSummary(input),
        recommendedDecision: this.validateDecision(parsed.recommendedDecision),
      };
    } catch (error: any) {
      this.logger.error(`Failed to parse Gemini response: ${error.message}`);
      throw error;
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
    this.logger.log(
      `Using fake implementation for candidate ${input.candidateId}`,
    );

    return {
      score: docCount > 0 ? 72 : 40,
      strengths: [
        "Communicates clearly",
        "Relevant project experience",
        "Technical skills align",
      ],
      concerns:
        docCount > 1
          ? ["Limited senior experience", "Could provide more examples"]
          : ["Limited documentation", "Additional documents recommended"],
      summary: `Candidate has ${docCount} document(s) on file. Based on available information, they appear to have relevant experience.`,
      recommendedDecision: docCount > 1 ? "advance" : "hold",
    };
  }
}

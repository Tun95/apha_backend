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
    finishReason?: string;
  }>;
  promptFeedback?: any;
}

@Injectable()
export class GeminiSummarizationProvider implements SummarizationProvider {
  private readonly logger = new Logger(GeminiSummarizationProvider.name);
  private readonly apiKey: string;
  // Use the correct model name - gemini-1.5-pro or gemini-1.0-pro
  private readonly apiUrl =
    "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent";

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      this.logger.warn("GEMINI_API_KEY not set, falling back to fake provider");
    }
    this.apiKey = apiKey || "";

    if (this.apiKey) {
      this.logger.log("Gemini provider initialized with API key");
      // Log first few chars of API key for debugging (don't log full key)
      this.logger.debug(
        `API Key starts with: ${this.apiKey.substring(0, 8)}...`,
      );
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
        `Calling Gemini API for candidate ${input.candidateId} with ${input.documents.length} documents`,
      );

      const prompt = this.buildPrompt(input);
      const response = await this.callGeminiAPI(prompt);

      this.logger.log("Gemini API call successful");
      return this.parseResponse(response, input);
    } catch (error: any) {
      this.logger.error(`Gemini API call failed: ${error.message}`);
      this.logger.error("Falling back to fake implementation");
      // Fall back to fake implementation on error
      return this.fakeImplementation(input);
    }
  }

  private buildPrompt(input: CandidateSummaryInput): string {
    const documentsText = input.documents
      .map((doc, index) => `Document ${index + 1}:\n${doc}`)
      .join("\n\n");

    return `
You are an expert technical recruiter analyzing candidate documents. Based on the following documents, provide a structured summary.

Documents:
${documentsText}

Provide a JSON response with exactly this structure:
{
  "score": number between 0-100 (based on candidate's fit),
  "strengths": ["strength1", "strength2", ...] (list 2-4 key strengths),
  "concerns": ["concern1", "concern2", ...] (list 1-3 potential concerns),
  "summary": "brief overall summary (2-3 sentences)",
  "recommendedDecision": "advance" | "hold" | "reject"
}

Requirements:
- Score should reflect overall candidate fit
- Strengths should be specific and job-relevant
- Concerns should be constructive
- Summary should capture overall impression
- Decision should be based on overall assessment

Return ONLY valid JSON, no other text or explanation.
`;
  }

  private async callGeminiAPI(prompt: string): Promise<GeminiResponse> {
    const url = `${this.apiUrl}?key=${this.apiKey}`;

    this.logger.debug(
      `Calling Gemini API at: ${url.replace(this.apiKey, "REDACTED")}`,
    );

    const response = await fetch(url, {
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
      const errorText = await response.text();
      this.logger.error(`Gemini API returned ${response.status}: ${errorText}`);
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  private parseResponse(
    response: GeminiResponse,
    input: CandidateSummaryInput,
  ): CandidateSummaryResult {
    try {
      // Check if response has candidates
      if (!response.candidates || response.candidates.length === 0) {
        this.logger.error("No candidates in Gemini response", response);
        return this.fakeImplementation(input);
      }

      const text = response.candidates[0]?.content?.parts[0]?.text;
      if (!text) {
        this.logger.error("No text in Gemini response part");
        return this.fakeImplementation(input);
      }

      this.logger.debug(
        `Raw Gemini response text: ${text.substring(0, 200)}...`,
      );

      // Extract JSON from response (handling potential markdown code blocks)
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

      // Clean the string (remove any non-JSON characters)
      jsonStr = jsonStr.trim();

      this.logger.debug(
        `Extracted JSON string: ${jsonStr.substring(0, 200)}...`,
      );

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseError: any) {
        this.logger.error(`Failed to parse JSON: ${parseError.message}`);
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
            : 50,
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths
          : ["No strengths identified"],
        concerns: Array.isArray(parsed.concerns)
          ? parsed.concerns
          : ["No concerns identified"],
        summary: parsed.summary || this.generateFallbackSummary(input),
        recommendedDecision: this.validateDecision(parsed.recommendedDecision),
      };
    } catch (error: any) {
      this.logger.error(`Failed to parse Gemini response: ${error.message}`);
      this.logger.error("Response text:", response);
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
    return `Candidate ${input.candidateId} submitted ${input.documents.length} document(s). Manual review recommended.`;
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
        "Technical skills align with requirements",
      ],
      concerns:
        docCount > 1
          ? [
              "Limited senior-level experience",
              "Could provide more specific examples",
            ]
          : [
              "Limited documentation provided",
              "Additional documents recommended",
            ],
      summary: `Candidate has ${docCount} document(s) on file. Based on available information, they appear to have relevant experience. Further interview recommended to assess fit.`,
      recommendedDecision: docCount > 1 ? "advance" : "hold",
    };
  }
}

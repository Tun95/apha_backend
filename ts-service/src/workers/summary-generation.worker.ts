// src/workers/summary-generation.worker.ts
import { Injectable, Logger } from "@nestjs/common";

import { CandidateSummary } from "../entities/candidate-summary.entity";
import {
  SUMMARIZATION_PROVIDER,
  SummarizationProvider,
} from "../llm/summarization-provider.interface";
import { QueueService } from "../queue/queue.service";
import { DocumentService } from "../candidates/services/document.service";
import { SummaryService } from "../candidates/services/summary.service";
import { Inject } from "@nestjs/common";

interface GenerateSummaryJob {
  summaryId: string;
  candidateId: string;
  workspaceId: string;
}

@Injectable()
export class SummaryGenerationWorker {
  private readonly logger = new Logger(SummaryGenerationWorker.name);
  private isProcessing = false;

  constructor(
    private readonly queueService: QueueService,
    private readonly documentService: DocumentService,
    private readonly summaryService: SummaryService,
    @Inject(SUMMARIZATION_PROVIDER)
    private readonly summarizationProvider: SummarizationProvider,
  ) {
    // Start processing jobs
    setInterval(() => this.processJobs(), 1000);
  }

  private async processJobs(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    try {
      const jobs = this.queueService.getQueuedJobs();
      const summaryJobs = jobs.filter((job) => job.name === "generate-summary");

      for (const job of summaryJobs) {
        await this.processJob(job.payload as GenerateSummaryJob);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(payload: GenerateSummaryJob): Promise<void> {
    this.logger.log(
      `Processing summary generation for job: ${payload.summaryId}`,
    );

    try {
      // Update status to processing
      await this.summaryService.updateSummaryStatus(
        payload.summaryId,
        "processing",
      );

      // Get all documents for the candidate
      const documentTexts =
        await this.documentService.getDocumentTextsForCandidate(
          { userId: "system", workspaceId: payload.workspaceId },
          payload.candidateId,
        );

      if (documentTexts.length === 0) {
        throw new Error("No documents found for candidate");
      }

      // Call LLM provider
      const result = await this.summarizationProvider.generateCandidateSummary({
        candidateId: payload.candidateId,
        documents: documentTexts,
      });

      // Update summary with results
      await this.summaryService.updateSummaryStatus(
        payload.summaryId,
        "completed",
        {
          score: result.score,
          strengths: result.strengths,
          concerns: result.concerns,
          summary: result.summary,
          recommendedDecision: result.recommendedDecision,
          provider: "gemini",
          promptVersion: "1.0",
        },
      );

      this.logger.log(
        `Successfully generated summary for ${payload.summaryId}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to generate summary: ${error.message}`);

      // Update summary with error
      await this.summaryService.updateSummaryStatus(
        payload.summaryId,
        "failed",
        {
          errorMessage: error.message,
        },
      );
    }
  }
}

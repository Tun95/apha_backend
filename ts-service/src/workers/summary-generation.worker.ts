import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Inject } from "@nestjs/common";

import {
  SUMMARIZATION_PROVIDER,
  SummarizationProvider,
} from "../llm/summarization-provider.interface";
import { QueueService } from "../queue/queue.service";
import { DocumentService } from "../candidates/services/document.service";
import { SummaryService } from "../candidates/services/summary.service";

interface GenerateSummaryJob {
  summaryId: string;
  candidateId: string;
  workspaceId: string;
}

@Injectable()
export class SummaryGenerationWorker implements OnModuleInit {
  private readonly logger = new Logger(SummaryGenerationWorker.name);
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private processedJobs = new Set<string>(); // Track processed jobs to avoid duplicates

  constructor(
    private readonly queueService: QueueService,
    private readonly documentService: DocumentService,
    private readonly summaryService: SummaryService,
    @Inject(SUMMARIZATION_PROVIDER)
    private readonly summarizationProvider: SummarizationProvider,
  ) {}

  onModuleInit() {
    // Start processing jobs when module initializes
    this.startProcessing();
  }

  startProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Process every 2 seconds instead of 1 to reduce load
    this.processingInterval = setInterval(() => this.processJobs(), 2000);
    this.logger.log("Summary generation worker started");
  }

  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      this.logger.log("Summary generation worker stopped");
    }
  }

  private async processJobs(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    try {
      // Only get pending jobs (not processed yet)
      const jobs = this.queueService.getPendingJobs();
      const summaryJobs = jobs.filter(
        (job) =>
          job.name === "generate-summary" && !this.processedJobs.has(job.id), // Skip already processed jobs
      );

      if (summaryJobs.length > 0) {
        this.logger.log(`Found ${summaryJobs.length} pending summary job(s)`);
      }

      for (const job of summaryJobs) {
        // Mark as processing immediately to avoid duplicate processing
        this.processedJobs.add(job.id);

        try {
          await this.processJob(job.payload as GenerateSummaryJob, job.id);
          // Mark as processed in queue service
          this.queueService.markAsProcessed(job.id);
        } catch (error: any) {
          this.logger.error(
            `Failed to process job ${job.id}: ${error.message}`,
          );
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(
    payload: GenerateSummaryJob,
    jobId: string,
  ): Promise<void> {
    this.logger.log(
      `Processing summary generation job ${jobId} for summary: ${payload.summaryId}`,
    );

    try {
      // Check if summary already exists and is not in pending state
      const existingSummary = await this.summaryService.getSummaryEntity(
        payload.summaryId,
      );
      if (!existingSummary) {
        throw new Error(`Summary ${payload.summaryId} not found`);
      }

      // Don't process if already completed or failed
      if (
        existingSummary.status === "completed" ||
        existingSummary.status === "failed"
      ) {
        this.logger.log(
          `Summary ${payload.summaryId} already ${existingSummary.status}, skipping`,
        );
        return;
      }

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
        `✅ Successfully generated summary for ${payload.summaryId}`,
      );
    } catch (error: any) {
      this.logger.error(`❌ Failed to generate summary: ${error.message}`);

      // Update summary with error
      await this.summaryService.updateSummaryStatus(
        payload.summaryId,
        "failed",
        {
          errorMessage: error.message,
        },
      );

      // Re-throw for job tracking
      throw error;
    }
  }
}

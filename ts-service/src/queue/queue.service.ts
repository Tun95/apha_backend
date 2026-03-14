import { randomUUID } from "crypto";

import { Injectable } from "@nestjs/common";

export interface EnqueuedJob<TPayload = unknown> {
  id: string;
  name: string;
  payload: TPayload;
  enqueuedAt: string;
  processed?: boolean; // Add processed flag
}

@Injectable()
export class QueueService {
  private readonly jobs: EnqueuedJob[] = [];

  enqueue<TPayload>(name: string, payload: TPayload): EnqueuedJob<TPayload> {
    const job: EnqueuedJob<TPayload> = {
      id: randomUUID(),
      name,
      payload,
      enqueuedAt: new Date().toISOString(),
      processed: false,
    };

    this.jobs.push(job);
    return job;
  }

  getPendingJobs(): readonly EnqueuedJob[] {
    return this.jobs.filter((job) => !job.processed);
  }

  markAsProcessed(jobId: string): void {
    const job = this.jobs.find((j) => j.id === jobId);
    if (job) {
      job.processed = true;
    }
  }

  // Optional: Clean up old processed jobs
  cleanProcessedJobs(olderThanMs: number = 3600000): void {
    const now = Date.now();
    const index = this.jobs.findIndex(
      (job) =>
        job.processed && now - new Date(job.enqueuedAt).getTime() > olderThanMs,
    );
    if (index !== -1) {
      this.jobs.splice(index, 1);
    }
  }

  // For backward compatibility
  getQueuedJobs(): readonly EnqueuedJob[] {
    return this.jobs;
  }
}

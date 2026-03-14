// src/candidates/services/summary.service.ts
import { randomUUID } from "crypto";

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuthUser } from "../../auth/auth.types";
import {
  CandidateSummary,
  SummaryStatus,
} from "../../entities/candidate-summary.entity";
import { SampleCandidate } from "../../entities/sample-candidate.entity";
import { QueueService } from "../../queue/queue.service";
import { SummaryResponseDto } from "../dto/summary-response.dto";

@Injectable()
export class SummaryService {
  constructor(
    @InjectRepository(CandidateSummary)
    private readonly summaryRepository: Repository<CandidateSummary>,
    @InjectRepository(SampleCandidate)
    private readonly candidateRepository: Repository<SampleCandidate>,
    private readonly queueService: QueueService,
  ) {}

  async requestSummaryGeneration(
    user: AuthUser,
    candidateId: string,
  ): Promise<{ summaryId: string; jobId: string }> {
    // Verify candidate exists and belongs to workspace
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, workspaceId: user.workspaceId },
    });

    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }

    // Create pending summary record
    const summary = this.summaryRepository.create({
      id: randomUUID(),
      candidateId,
      workspaceId: user.workspaceId,
      status: "pending",
    });

    await this.summaryRepository.save(summary);

    // Enqueue job for processing
    const job = this.queueService.enqueue("generate-summary", {
      summaryId: summary.id,
      candidateId,
      workspaceId: user.workspaceId,
    });

    return { summaryId: summary.id, jobId: job.id };
  }

  async getSummariesForCandidate(
    user: AuthUser,
    candidateId: string,
  ): Promise<SummaryResponseDto[]> {
    const summaries = await this.summaryRepository.find({
      where: { candidateId, workspaceId: user.workspaceId },
      order: { createdAt: "DESC" },
    });

    return summaries.map(this.mapToDto);
  }

  async getSummaryById(
    user: AuthUser,
    candidateId: string,
    summaryId: string,
  ): Promise<SummaryResponseDto> {
    const summary = await this.summaryRepository.findOne({
      where: {
        id: summaryId,
        candidateId,
        workspaceId: user.workspaceId,
      },
    });

    if (!summary) {
      throw new NotFoundException("Summary not found");
    }

    return this.mapToDto(summary);
  }

  async updateSummaryStatus(
    summaryId: string,
    status: SummaryStatus,
    data?: Partial<CandidateSummary>,
  ): Promise<void> {
    await this.summaryRepository.update(
      { id: summaryId },
      {
        status,
        ...data,
        updatedAt: new Date(),
      },
    );
  }

  async getSummaryEntity(summaryId: string): Promise<CandidateSummary | null> {
    return this.summaryRepository.findOne({ where: { id: summaryId } });
  }

  private mapToDto(summary: CandidateSummary): SummaryResponseDto {
    return {
      id: summary.id,
      candidateId: summary.candidateId,
      status: summary.status,
      score: summary.score ?? undefined,
      strengths: summary.strengths ?? undefined,
      concerns: summary.concerns ?? undefined,
      summary: summary.summary ?? undefined,
      recommendedDecision: summary.recommendedDecision ?? undefined,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
      errorMessage: summary.errorMessage ?? undefined,
    };
  }
}

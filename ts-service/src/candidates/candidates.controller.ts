// src/candidates/candidates.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../auth/auth-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { FakeAuthGuard } from "../auth/fake-auth.guard";
import { UploadDocumentDto } from "./dto/upload-document.dto";

import { DocumentService } from "./services/document.service";
import { SummaryService } from "./services/summary.service";
import {
  SummaryListResponseDto,
  SummaryResponseDto,
} from "./dto/summary-response.dto";

@Controller("candidates")
@UseGuards(FakeAuthGuard)
export class CandidatesController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly summaryService: SummaryService,
  ) {}

  @Post(":candidateId/documents")
  async uploadDocument(
    @CurrentUser() user: AuthUser,
    @Param("candidateId") candidateId: string,
    @Body() dto: UploadDocumentDto,
  ) {
    const document = await this.documentService.uploadDocument(
      user,
      candidateId,
      dto,
    );
    return {
      id: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      uploadedAt: document.uploadedAt,
    };
  }

  @Post(":candidateId/summaries/generate")
  async requestSummaryGeneration(
    @CurrentUser() user: AuthUser,
    @Param("candidateId") candidateId: string,
  ) {
    const result = await this.summaryService.requestSummaryGeneration(
      user,
      candidateId,
    );
    return {
      message: "Summary generation queued",
      summaryId: result.summaryId,
      jobId: result.jobId,
    };
  }

  @Get(":candidateId/summaries")
  async listSummaries(
    @CurrentUser() user: AuthUser,
    @Param("candidateId") candidateId: string,
  ): Promise<SummaryListResponseDto> {
    const summaries = await this.summaryService.getSummariesForCandidate(
      user,
      candidateId,
    );
    return {
      summaries,
      total: summaries.length,
    };
  }

  @Get(":candidateId/summaries/:summaryId")
  async getSummary(
    @CurrentUser() user: AuthUser,
    @Param("candidateId") candidateId: string,
    @Param("summaryId") summaryId: string,
  ): Promise<SummaryResponseDto> {
    return this.summaryService.getSummaryById(user, candidateId, summaryId);
  }
}

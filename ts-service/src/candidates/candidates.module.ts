import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CandidateDocument } from "../entities/candidate-document.entity";
import { CandidateSummary } from "../entities/candidate-summary.entity";
import { SampleCandidate } from "../entities/sample-candidate.entity";
import { LlmModule } from "../llm/llm.module";
import { QueueModule } from "../queue/queue.module";
import { CandidatesController } from "./candidates.controller";
import { DocumentService } from "./services/document.service";
import { SummaryService } from "./services/summary.service";
import { SummaryGenerationWorker } from "../workers/summary-generation.worker";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CandidateDocument,
      CandidateSummary,
      SampleCandidate,
    ]),
    QueueModule,
    LlmModule,
  ],
  controllers: [CandidatesController],
  providers: [DocumentService, SummaryService, SummaryGenerationWorker],
  exports: [DocumentService, SummaryService],
})
export class CandidatesModule {}

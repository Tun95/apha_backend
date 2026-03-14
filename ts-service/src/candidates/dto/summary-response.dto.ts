// src/candidates/dto/summary-response.dto.ts
import { RecommendedDecision } from "../../entities/candidate-summary.entity";

export class SummaryResponseDto {
  id!: string;
  candidateId!: string;
  status!: string;
  score?: number;
  strengths?: string[];
  concerns?: string[];
  summary?: string;
  recommendedDecision?: RecommendedDecision;
  createdAt!: Date;
  updatedAt!: Date;
  errorMessage?: string;
}

export class SummaryListResponseDto {
  summaries!: SummaryResponseDto[];
  total!: number;
}

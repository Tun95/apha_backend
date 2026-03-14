import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { SampleCandidate } from "./sample-candidate.entity";

export type SummaryStatus = "pending" | "processing" | "completed" | "failed";
export type RecommendedDecision = "advance" | "hold" | "reject";

@Entity("candidate_summaries")
export class CandidateSummary {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ name: "candidate_id", type: "varchar", length: 64 })
  candidateId!: string;

  @Column({ name: "workspace_id", type: "varchar", length: 64 })
  workspaceId!: string;

  @Column({ type: "varchar", length: 20 })
  status!: SummaryStatus;

  @Column({ type: "integer", nullable: true })
  score!: number | null;

  @Column({ type: "jsonb", nullable: true })
  strengths!: string[] | null;

  @Column({ type: "jsonb", nullable: true })
  concerns!: string[] | null;

  @Column({ type: "text", nullable: true })
  summary!: string | null;

  @Column({
    name: "recommended_decision",
    type: "varchar",
    length: 20,
    nullable: true,
  })
  recommendedDecision!: RecommendedDecision | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  provider!: string | null;

  @Column({
    name: "prompt_version",
    type: "varchar",
    length: 20,
    nullable: true,
  })
  promptVersion!: string | null;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => SampleCandidate, { onDelete: "CASCADE" })
  @JoinColumn([
    { name: "candidate_id", referencedColumnName: "id" },
    { name: "workspace_id", referencedColumnName: "workspaceId" },
  ])
  candidate!: SampleCandidate;
}

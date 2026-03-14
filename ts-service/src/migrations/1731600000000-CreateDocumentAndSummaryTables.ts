import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CreateDocumentAndSummaryTables1731600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, ensure sample_candidates has a composite primary key or unique constraint
    // But since we can't modify the existing migration, we'll create a unique index
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_sample_candidates_composite" 
      ON "sample_candidates"("id", "workspace_id")
    `);

    // Create candidate_documents table
    await queryRunner.createTable(
      new Table({
        name: "candidate_documents",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "64",
            isPrimary: true,
          },
          {
            name: "candidate_id",
            type: "varchar",
            length: "64",
            isNullable: false,
          },
          {
            name: "workspace_id",
            type: "varchar",
            length: "64",
            isNullable: false,
          },
          {
            name: "document_type",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "file_name",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "storage_key",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "raw_text",
            type: "text",
            isNullable: false,
          },
          {
            name: "uploaded_at",
            type: "timestamptz",
            default: "now()",
            isNullable: false,
          },
        ],
      }),
    );

    // Create candidate_summaries table
    await queryRunner.createTable(
      new Table({
        name: "candidate_summaries",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "64",
            isPrimary: true,
          },
          {
            name: "candidate_id",
            type: "varchar",
            length: "64",
            isNullable: false,
          },
          {
            name: "workspace_id",
            type: "varchar",
            length: "64",
            isNullable: false,
          },
          {
            name: "status",
            type: "varchar",
            length: "20",
            isNullable: false,
          },
          {
            name: "score",
            type: "integer",
            isNullable: true,
          },
          {
            name: "strengths",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "concerns",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "summary",
            type: "text",
            isNullable: true,
          },
          {
            name: "recommended_decision",
            type: "varchar",
            length: "20",
            isNullable: true,
          },
          {
            name: "provider",
            type: "varchar",
            length: "50",
            isNullable: true,
          },
          {
            name: "prompt_version",
            type: "varchar",
            length: "20",
            isNullable: true,
          },
          {
            name: "error_message",
            type: "text",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "now()",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamptz",
            default: "now()",
            isNullable: false,
          },
        ],
      }),
    );

    // Create foreign keys - Option 1: Reference just the id (simpler)
    await queryRunner.createForeignKey(
      "candidate_documents",
      new TableForeignKey({
        name: "fk_candidate_documents_candidate",
        columnNames: ["candidate_id"],
        referencedTableName: "sample_candidates",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    // Add a separate foreign key for workspace if needed, or handle workspace in application logic
    await queryRunner.createForeignKey(
      "candidate_summaries",
      new TableForeignKey({
        name: "fk_candidate_summaries_candidate",
        columnNames: ["candidate_id"],
        referencedTableName: "sample_candidates",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      "candidate_documents",
      new TableIndex({
        name: "idx_candidate_documents_candidate",
        columnNames: ["candidate_id"],
      }),
    );

    await queryRunner.createIndex(
      "candidate_documents",
      new TableIndex({
        name: "idx_candidate_documents_workspace",
        columnNames: ["workspace_id"],
      }),
    );

    await queryRunner.createIndex(
      "candidate_summaries",
      new TableIndex({
        name: "idx_candidate_summaries_candidate",
        columnNames: ["candidate_id"],
      }),
    );

    await queryRunner.createIndex(
      "candidate_summaries",
      new TableIndex({
        name: "idx_candidate_summaries_workspace",
        columnNames: ["workspace_id"],
      }),
    );

    await queryRunner.createIndex(
      "candidate_summaries",
      new TableIndex({
        name: "idx_candidate_summaries_status",
        columnNames: ["status"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      "candidate_summaries",
      "idx_candidate_summaries_status",
    );
    await queryRunner.dropIndex(
      "candidate_summaries",
      "idx_candidate_summaries_workspace",
    );
    await queryRunner.dropIndex(
      "candidate_summaries",
      "idx_candidate_summaries_candidate",
    );
    await queryRunner.dropIndex(
      "candidate_documents",
      "idx_candidate_documents_workspace",
    );
    await queryRunner.dropIndex(
      "candidate_documents",
      "idx_candidate_documents_candidate",
    );

    // Drop foreign keys
    await queryRunner.dropForeignKey(
      "candidate_summaries",
      "fk_candidate_summaries_candidate",
    );
    await queryRunner.dropForeignKey(
      "candidate_documents",
      "fk_candidate_documents_candidate",
    );

    // Drop tables
    await queryRunner.dropTable("candidate_summaries");
    await queryRunner.dropTable("candidate_documents");

    // Drop the unique index we created
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_sample_candidates_composite"`,
    );
  }
}

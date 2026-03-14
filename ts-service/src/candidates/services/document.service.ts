// src/candidates/services/document.service.ts
import { randomUUID } from "crypto";
import * as path from "path";
import * as fs from "fs/promises";

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuthUser } from "../../auth/auth.types";
import {
  CandidateDocument,
  DocumentType,
} from "../../entities/candidate-document.entity";
import { SampleCandidate } from "../../entities/sample-candidate.entity";
import { UploadDocumentDto } from "../dto/upload-document.dto";

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(CandidateDocument)
    private readonly documentRepository: Repository<CandidateDocument>,
    @InjectRepository(SampleCandidate)
    private readonly candidateRepository: Repository<SampleCandidate>,
  ) {}

  async uploadDocument(
    user: AuthUser,
    candidateId: string,
    dto: UploadDocumentDto,
  ): Promise<CandidateDocument> {
    // Verify candidate exists and belongs to workspace
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, workspaceId: user.workspaceId },
    });

    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }

    // Generate storage key and save file locally
    const storageKey = await this.saveFileLocally(dto.fileName, dto.rawText);

    const document = this.documentRepository.create({
      id: randomUUID(),
      candidateId,
      workspaceId: user.workspaceId,
      documentType: dto.documentType as DocumentType,
      fileName: dto.fileName,
      storageKey,
      rawText: dto.rawText,
    });

    return this.documentRepository.save(document);
  }

  async getDocumentsForCandidate(
    user: AuthUser,
    candidateId: string,
  ): Promise<CandidateDocument[]> {
    // First verify the candidate belongs to the workspace
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, workspaceId: user.workspaceId },
    });

    if (!candidate) {
      throw new NotFoundException("Candidate not found in this workspace");
    }

    return this.documentRepository.find({
      where: {
        candidateId,
        workspaceId: user.workspaceId, // Still filter by workspace for extra security
      },
      order: { uploadedAt: "DESC" },
    });
  }

  async getDocumentTextsForCandidate(
    user: AuthUser,
    candidateId: string,
  ): Promise<string[]> {
    const documents = await this.getDocumentsForCandidate(user, candidateId);
    return documents.map((doc) => doc.rawText);
  }

  private async saveFileLocally(
    fileName: string,
    content: string,
  ): Promise<string> {
    const uploadDir = path.join(process.cwd(), "uploads");
    const storageKey = `${randomUUID()}-${fileName}`;
    const filePath = path.join(uploadDir, storageKey);

    try {
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");
      return storageKey;
    } catch (error: any) {
      throw new Error(`Failed to save file: ${error.message}`);
    }
  }
}

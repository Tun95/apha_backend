// src/candidates/services/document.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CandidateDocument } from "../../entities/candidate-document.entity";
import { SampleCandidate } from "../../entities/sample-candidate.entity";
import { DocumentService } from "./document.service";
import { DocumentType } from "../dto/upload-document.dto";

describe("DocumentService", () => {
  let service: DocumentService;
  let documentRepository: Repository<CandidateDocument>;
  let candidateRepository: Repository<SampleCandidate>;

  const mockUser = {
    userId: "user-1",
    workspaceId: "workspace-1",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: getRepositoryToken(CandidateDocument),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SampleCandidate),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    documentRepository = module.get(getRepositoryToken(CandidateDocument));
    candidateRepository = module.get(getRepositoryToken(SampleCandidate));
  });

  it("should throw NotFoundException when candidate does not exist", async () => {
    jest.spyOn(candidateRepository, "findOne").mockResolvedValue(null);

    await expect(
      service.uploadDocument(mockUser, "candidate-1", {
        documentType: DocumentType.RESUME,
        fileName: "resume.pdf",
        rawText: "Sample resume text",
      }),
    ).rejects.toThrow("Candidate not found");
  });

  it("should upload document successfully", async () => {
    const mockCandidate = { id: "candidate-1", workspaceId: "workspace-1" };
    const mockDocument = {
      id: "doc-1",
      candidateId: "candidate-1",
      workspaceId: "workspace-1",
      documentType: DocumentType.RESUME,
      fileName: "resume.pdf",
      rawText: "Sample resume text",
      storageKey: expect.any(String),
    };

    jest
      .spyOn(candidateRepository, "findOne")
      .mockResolvedValue(mockCandidate as any);
    jest
      .spyOn(documentRepository, "create")
      .mockReturnValue(mockDocument as any);
    jest
      .spyOn(documentRepository, "save")
      .mockResolvedValue(mockDocument as any);

    const result = await service.uploadDocument(mockUser, "candidate-1", {
      documentType: DocumentType.RESUME,
      fileName: "resume.pdf",
      rawText: "Sample resume text",
    });

    expect(result).toEqual(mockDocument);
    expect(documentRepository.create).toHaveBeenCalled();
    expect(documentRepository.save).toHaveBeenCalled();
  });
});

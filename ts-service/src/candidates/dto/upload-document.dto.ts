// src/candidates/dto/upload-document.dto.ts
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export enum DocumentType {
  RESUME = "resume",
  COVER_LETTER = "cover_letter",
  OTHER = "other",
}

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  rawText!: string;
}

// src/llm/llm.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { GeminiSummarizationProvider } from "./gemini-summarization.provider";
import { FakeSummarizationProvider } from "./fake-summarization.provider";
import { SUMMARIZATION_PROVIDER } from "./summarization-provider.interface";

@Module({
  imports: [ConfigModule],
  providers: [
    GeminiSummarizationProvider,
    FakeSummarizationProvider,
    {
      provide: SUMMARIZATION_PROVIDER,
      useFactory: (
        geminiProvider: GeminiSummarizationProvider,
        fakeProvider: FakeSummarizationProvider,
      ) => {
        // Use Gemini if API key is available, otherwise fall back to fake
        return process.env.GEMINI_API_KEY ? geminiProvider : fakeProvider;
      },
      inject: [GeminiSummarizationProvider, FakeSummarizationProvider],
    },
  ],
  exports: [SUMMARIZATION_PROVIDER],
})
export class LlmModule {}

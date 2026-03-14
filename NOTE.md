# Backend Engineering Assessment Documentation

## Overview
This repository contains two standalone services built for the backend engineering assessment:

1. **Python/FastAPI Service**: Briefing Report Generator
2. **TypeScript/NestJS Service**: Candidate Document Intake + Summary Workflow

Both services are designed to be run locally and demonstrate different aspects of backend engineering including API design, database modeling, async processing, and external API integration.

---

# Part A: Briefing Report Generator (FastAPI/Python)

## Base URL
```
http://localhost:8000
```

## Technology Stack
- **Framework**: FastAPI 0.115.5
- **Database**: PostgreSQL with SQLAlchemy 2.0.36
- **Validation**: Pydantic 2.12.5
- **Templating**: Jinja2 3.1.4
- **Migrations**: Custom SQL migration runner

## Setup Instructions

### Prerequisites
- Python 3.12+
- PostgreSQL 14+
- pip (Python package manager)

### Installation

```bash
# Navigate to python service
cd python-service

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate  # On Linux/Mac
# or
.venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
```

### Database Setup

```bash
# Create PostgreSQL database
createdb assessment_db

# Or via psql
psql -U postgres -c "CREATE DATABASE assessment_db;"

# Run migrations
python -m app.db.run_migrations up
```

### Environment Variables
Create a `.env` file:
```env
DATABASE_URL=postgresql+psycopg://assessment_user:assessment_pass@localhost:5432/assessment_db
APP_ENV=development
APP_PORT=8000
```

### Running the Service

```bash
# Development mode with auto-reload
uvicorn app.main:app --reload --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Running Tests

```bash
pytest tests/ -v
```

---

## API Endpoints

### Health Check

Verify the API is running.

**Endpoint**
```
GET /health
```

**Response**
```json
{
  "status": "ok"
}
```

---

### Create Briefing

Create a new briefing report with company details, key points, risks, and metrics.

**Endpoint**
```
POST /briefings
```

**Request Body**
```json
{
  "company_name": "Acme Holdings",
  "ticker": "acme",
  "sector": "Industrial Technology",
  "analyst_name": "Jane Doe",
  "summary": "Acme is benefiting from strong enterprise demand and improving operating leverage, though customer concentration remains a near-term risk.",
  "recommendation": "Monitor for margin expansion and customer diversification before increasing exposure.",
  "key_points": [
    "Revenue grew 18% year-over-year in the latest quarter.",
    "Management raised full-year guidance.",
    "Enterprise subscriptions now account for 62% of recurring revenue."
  ],
  "risks": [
    "Top two customers account for 41% of total revenue.",
    "International expansion may pressure margins over the next two quarters."
  ],
  "metrics": [
    {
      "name": "Revenue Growth",
      "value": "18%"
    },
    {
      "name": "Operating Margin",
      "value": "22.4%"
    },
    {
      "name": "P/E Ratio",
      "value": "28.1x"
    }
  ]
}
```

**Validation Rules**
| Field | Requirement |
|-------|-------------|
| company_name | Required |
| ticker | Required, automatically uppercased |
| sector | Required |
| analyst_name | Required |
| summary | Required |
| recommendation | Required |
| key_points | At least 2 items required |
| risks | At least 1 item required |
| metrics | Optional, but names must be unique |

**Success Response (201 Created)**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_name": "Acme Holdings",
  "ticker": "ACME",
  "sector": "Industrial Technology",
  "analyst_name": "Jane Doe",
  "summary": "Acme is benefiting from strong enterprise demand...",
  "recommendation": "Monitor for margin expansion...",
  "generated": false,
  "generated_at": null,
  "created_at": "2024-03-14T12:00:00.123Z",
  "updated_at": "2024-03-14T12:00:00.123Z",
  "key_points": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "point": "Revenue grew 18% year-over-year in the latest quarter.",
      "display_order": 0
    }
  ],
  "risks": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440004",
      "risk": "Top two customers account for 41% of total revenue.",
      "display_order": 0
    }
  ],
  "metrics": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440006",
      "name": "Revenue Growth",
      "value": "18%",
      "display_order": 0
    }
  ]
}
```

---

### Get Briefing by ID

Retrieve a specific briefing by its ID.

**Endpoint**
```
GET /briefings/{briefing_id}
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| briefing_id | UUID | The unique identifier of the briefing |

**Success Response (200 OK)**
Same structure as the create response.

**Error Response (404 Not Found)**
```json
{
  "detail": "Briefing not found"
}
```

---

### List All Briefings

Retrieve a paginated list of all briefings.

**Endpoint**
```
GET /briefings
```

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| skip | integer | 0 | Number of records to skip |
| limit | integer | 100 | Maximum records to return |

**Example**
```
GET /briefings?skip=0&limit=10
```

**Success Response (200 OK)**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "company_name": "Acme Holdings",
    "ticker": "ACME",
    "analyst_name": "Jane Doe",
    "generated": false,
    "created_at": "2024-03-14T12:00:00.123Z"
  }
]
```

---

### Generate Report

Generate an HTML report for a briefing and mark it as generated.

**Endpoint**
```
POST /briefings/{briefing_id}/generate
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| briefing_id | UUID | The unique identifier of the briefing |

**Success Response (200 OK)**
```json
{
  "message": "Report generation completed",
  "briefing_id": "550e8400-e29b-41d4-a716-446655440000",
  "generated_at": "2024-03-14T12:05:00.123Z"
}
```

**If Already Generated**
```json
{
  "message": "Report already generated",
  "briefing_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### Get HTML Report

Retrieve the generated HTML report for a briefing.

**Endpoint**
```
GET /briefings/{briefing_id}/html
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| briefing_id | UUID | The unique identifier of the briefing |

**Response**: HTML content with professional styling including:
- Company information block
- Executive summary
- Key points section
- Risks section
- Recommendation section
- Metrics grid (if available)
- Generated timestamp

**Error Response (400 Bad Request)**
```json
{
  "detail": "Report has not been generated yet. Please POST to /generate first."
}
```

---

## Database Schema

### Tables

#### briefings
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| company_name | VARCHAR(255) | NOT NULL | Company name |
| ticker | VARCHAR(10) | NOT NULL | Stock ticker |
| sector | VARCHAR(100) | NOT NULL | Industry sector |
| analyst_name | VARCHAR(100) | NOT NULL | Analyst name |
| summary | TEXT | NOT NULL | Executive summary |
| recommendation | TEXT | NOT NULL | Analyst recommendation |
| generated | BOOLEAN | DEFAULT FALSE | Report generation status |
| generated_at | TIMESTAMPTZ | NULL | When report was generated |
| created_at | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | Last update timestamp |

#### briefing_key_points
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| briefing_id | UUID | FOREIGN KEY | References briefings(id) |
| point_text | TEXT | NOT NULL | Key point content |
| display_order | INTEGER | NOT NULL | Order for display |
| created_at | TIMESTAMPTZ | NOT NULL | Creation timestamp |

#### briefing_risks
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| briefing_id | UUID | FOREIGN KEY | References briefings(id) |
| risk_text | TEXT | NOT NULL | Risk description |
| display_order | INTEGER | NOT NULL | Order for display |
| created_at | TIMESTAMPTZ | NOT NULL | Creation timestamp |

#### briefing_metrics
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| briefing_id | UUID | FOREIGN KEY | References briefings(id) |
| metric_name | VARCHAR(100) | NOT NULL | Metric name |
| metric_value | VARCHAR(50) | NOT NULL | Metric value |
| display_order | INTEGER | NOT NULL | Order for display |
| created_at | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| *Unique constraint* | | (briefing_id, metric_name) | Ensures unique metric names per briefing |

---

## Design Decisions

### 1. Data Modeling
- **Normalized Structure**: Separated key points, risks, and metrics into their own tables to allow for flexible querying and future expansion.
- **Composite Keys**: Used UUIDs for primary keys to avoid collisions and support distributed systems.
- **Display Order**: Added `display_order` field to maintain the original order of lists as provided in the request.

### 2. Validation
- **Pydantic Models**: Used for request/response validation with custom validators for business rules.
- **Ticker Normalization**: Automatically converts ticker symbols to uppercase.
- **Unique Metric Names**: Enforced at both application and database levels.

### 3. Service Layer
- **Separation of Concerns**: Business logic isolated in service classes, not in controllers.
- **View Model Pattern**: Transformed database models into presentation-ready view models for HTML templates.
- **Repository Pattern**: Used SQLAlchemy ORM with repository-style queries.

### 4. HTML Generation
- **Jinja2 Templating**: Server-side rendering with proper escaping to prevent XSS.
- **CSS Styling**: Professional report styling with responsive design.
- **Graceful Degradation**: Handles missing metrics elegantly.

### 5. Migration Strategy
- **Custom SQL Migrations**: Manual migration runner for better control and visibility.
- **Idempotent Operations**: All migrations use `IF NOT EXISTS` and `DROP IF EXISTS` where appropriate.
- **Down Migrations**: Provided for rollback capability.

---

## What Could Be Improved

1. **Authentication/Authorization**: Add user authentication and role-based access control.
2. **Caching**: Implement Redis caching for frequently accessed briefings.
3. **Pagination**: Add cursor-based pagination for large datasets.
4. **Export Options**: Support PDF export in addition to HTML.
5. **Versioning**: Add API versioning for backward compatibility.
6. **Metrics Dashboard**: Create admin dashboard for monitoring briefing statistics.
7. **Webhooks**: Notify external systems when reports are generated.
8. **Batch Operations**: Support bulk briefing creation and report generation.
9. **Search/Filter**: Add search capabilities for briefings by company, analyst, date range.
10. **Rate Limiting**: Implement rate limiting for API endpoints.

---

# Part B: Candidate Document Intake + Summary Workflow (NestJS/TypeScript)

## Base URL
```
http://localhost:3000
```

## Technology Stack
- **Framework**: NestJS 10.4.15
- **Database**: PostgreSQL with TypeORM 0.3.20
- **Validation**: class-validator 0.14.1
- **LLM Integration**: Google Gemini API
- **Queue**: In-memory queue service
- **Authentication**: Header-based fake auth (x-user-id, x-workspace-id)

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn
- Google Gemini API key (optional, falls back to fake provider)

### Installation

```bash
# Navigate to TypeScript service
cd ts-service

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Database Setup

```bash
# Create PostgreSQL database
createdb assessment_db

# Or via psql
psql -U postgres -c "CREATE DATABASE assessment_db;"

# Run migrations
npm run migration:run
```

### Environment Variables
Create a `.env` file:
```env
PORT=3000
DATABASE_URL=postgres://assessment_user:assessment_pass@localhost:5432/assessment_db
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here  # Optional, falls back to fake provider
```

### Authentication Headers
All endpoints require the following headers:
| Header | Description | Example |
|--------|-------------|---------|
| x-user-id | User identifier | user-123 |
| x-workspace-id | Workspace identifier | workspace-456 |

### Running the Service

```bash
# Development mode with watch
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

---

## API Endpoints

### Health Check

Verify the API is running.

**Endpoint**
```
GET /health
```

**Response**
```json
{
  "status": "ok"
}
```

---

### Create Candidate (Sample)

Create a new candidate (from starter code).

**Endpoint**
```
POST /sample/candidates
```

**Headers**
```
x-user-id: user-123
x-workspace-id: workspace-456
Content-Type: application/json
```

**Request Body**
```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com"
}
```

**Success Response (201 Created)**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "workspaceId": "workspace-456",
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "createdAt": "2024-03-14T12:00:00.123Z"
}
```

---

### Upload Candidate Document

Upload a document (resume, cover letter, etc.) for a candidate.

**Endpoint**
```
POST /candidates/{candidateId}/documents
```

**Headers**
```
x-user-id: user-123
x-workspace-id: workspace-456
Content-Type: application/json
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| candidateId | string | The unique identifier of the candidate |

**Request Body**
```json
{
  "documentType": "resume",
  "fileName": "john_doe_resume.txt",
  "rawText": "Experienced software engineer with 8 years of experience in full-stack development. Proficient in TypeScript, Node.js, React, and Python. Led multiple successful projects and mentored junior developers. Strong background in system design and cloud architecture (AWS)."
}
```

**Document Types**
- `resume` - Candidate resume/CV
- `cover_letter` - Cover letter
- `other` - Other document types

**Success Response (201 Created)**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "documentType": "resume",
  "fileName": "john_doe_resume.txt",
  "uploadedAt": "2024-03-14T12:05:00.123Z"
}
```

**Error Response (404 Not Found)**
```json
{
  "statusCode": 404,
  "message": "Candidate not found"
}
```

---

### Request Summary Generation

Queue a summary generation job for a candidate.

**Endpoint**
```
POST /candidates/{candidateId}/summaries/generate
```

**Headers**
```
x-user-id: user-123
x-workspace-id: workspace-456
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| candidateId | string | The unique identifier of the candidate |

**Success Response (201 Created)**
```json
{
  "message": "Summary generation queued",
  "summaryId": "770e8400-e29b-41d4-a716-446655440002",
  "jobId": "880e8400-e29b-41d4-a716-446655440003"
}
```

**If Already Pending**
```json
{
  "message": "A summary is already being generated for this candidate",
  "summaryId": "770e8400-e29b-41d4-a716-446655440002"
}
```

---

### List Candidate Summaries

Retrieve all summaries for a candidate.

**Endpoint**
```
GET /candidates/{candidateId}/summaries
```

**Headers**
```
x-user-id: user-123
x-workspace-id: workspace-456
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| candidateId | string | The unique identifier of the candidate |

**Success Response (200 OK)**
```json
{
  "summaries": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "candidateId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "score": 85,
      "strengths": [
        "Strong technical background",
        "Leadership experience",
        "Cloud expertise"
      ],
      "concerns": [
        "Limited senior-level experience"
      ],
      "summary": "Experienced full-stack developer with 8 years of experience...",
      "recommendedDecision": "advance",
      "createdAt": "2024-03-14T12:10:00.123Z",
      "updatedAt": "2024-03-14T12:10:30.123Z"
    }
  ],
  "total": 1
}
```

**Status Types**
| Status | Description |
|--------|-------------|
| pending | Job queued, waiting for processing |
| processing | Worker is generating summary |
| completed | Summary generated successfully |
| failed | Summary generation failed |

**Decision Types**
| Decision | Description |
|----------|-------------|
| advance | Candidate should move forward |
| hold | Keep for later consideration |
| reject | Not suitable for position |

---

### Get Specific Summary

Retrieve a specific summary by ID.

**Endpoint**
```
GET /candidates/{candidateId}/summaries/{summaryId}
```

**Headers**
```
x-user-id: user-123
x-workspace-id: workspace-456
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| candidateId | string | The unique identifier of the candidate |
| summaryId | string | The unique identifier of the summary |

**Success Response (200 OK)**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "candidateId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "score": 85,
  "strengths": [
    "Strong technical background",
    "Leadership experience",
    "Cloud expertise"
  ],
  "concerns": [
    "Limited senior-level experience"
  ],
  "summary": "Experienced full-stack developer with 8 years of experience...",
  "recommendedDecision": "advance",
  "createdAt": "2024-03-14T12:10:00.123Z",
  "updatedAt": "2024-03-14T12:10:30.123Z"
}
```

**Error Response (404 Not Found)**
```json
{
  "statusCode": 404,
  "message": "Summary not found"
}
```

---

## Database Schema

### Tables

#### sample_candidates (from starter)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PRIMARY KEY | Unique identifier |
| workspace_id | VARCHAR(64) | NOT NULL | Workspace isolation |
| full_name | VARCHAR(160) | NOT NULL | Candidate name |
| email | VARCHAR(160) | NULL | Email address |
| created_at | TIMESTAMPTZ | NOT NULL | Creation timestamp |

#### candidate_documents
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PRIMARY KEY | Unique identifier |
| candidate_id | VARCHAR(64) | FOREIGN KEY | References sample_candidates(id) |
| workspace_id | VARCHAR(64) | NOT NULL | Workspace isolation |
| document_type | VARCHAR(50) | NOT NULL | resume/cover_letter/other |
| file_name | VARCHAR(255) | NOT NULL | Original filename |
| storage_key | VARCHAR(255) | NOT NULL | Local storage path |
| raw_text | TEXT | NOT NULL | Extracted text content |
| uploaded_at | TIMESTAMPTZ | NOT NULL | Upload timestamp |

#### candidate_summaries
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PRIMARY KEY | Unique identifier |
| candidate_id | VARCHAR(64) | FOREIGN KEY | References sample_candidates(id) |
| workspace_id | VARCHAR(64) | NOT NULL | Workspace isolation |
| status | VARCHAR(20) | NOT NULL | pending/processing/completed/failed |
| score | INTEGER | NULL | Candidate score (0-100) |
| strengths | JSONB | NULL | Array of strengths |
| concerns | JSONB | NULL | Array of concerns |
| summary | TEXT | NULL | Generated summary text |
| recommended_decision | VARCHAR(20) | NULL | advance/hold/reject |
| provider | VARCHAR(50) | NULL | LLM provider used |
| prompt_version | VARCHAR(20) | NULL | Version of prompt |
| error_message | TEXT | NULL | Error details if failed |
| created_at | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | Last update timestamp |

---

## LLM Integration

### Provider: Google Gemini API

The service integrates with Google's Gemini API for candidate summarization with automatic fallback to a fake provider.

### Configuration

1. Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `.env`:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. If no API key is provided, the service automatically falls back to the fake provider

### Model Used
- **Model**: `gemini-flash-latest` (or `gemini-3-flash-preview`)
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`
- **Authentication**: `X-goog-api-key` header

### Prompt Template
```text
You are an expert technical recruiter analyzing candidate documents. Based on the following documents, provide a structured summary.

Documents:
{document_texts}

Provide a JSON response with exactly this structure:
{
  "score": number between 0-100,
  "strengths": ["strength1", "strength2", ...],
  "concerns": ["concern1", "concern2", ...],
  "summary": "brief overall summary",
  "recommendedDecision": "advance" | "hold" | "reject"
}
```

### Fallback Provider
When Gemini API is unavailable or no API key is provided, the service uses a fake provider that generates realistic mock data for testing.

---

## Design Decisions

### 1. Workspace Isolation
- **Header-based Auth**: Simple but effective workspace isolation using `x-workspace-id` header
- **Composite Keys**: All entities include `workspace_id` and queries filter by it
- **Data Integrity**: Foreign keys ensure referential integrity across workspace boundaries

### 2. Asynchronous Processing
- **Queue Pattern**: In-memory queue service for job management
- **Status Tracking**: State machine with clear transitions (pending → processing → completed/failed)
- **Idempotency**: Prevents duplicate processing of the same job
- **Error Handling**: Graceful degradation with error messages stored for debugging

### 3. LLM Abstraction
- **Provider Interface**: `SummarizationProvider` interface allows swapping implementations
- **Dependency Injection**: Provider injected via NestJS DI container
- **Automatic Fallback**: Falls back to fake provider on API failure
- **Structured Output**: Enforces consistent response format with validation

### 4. Database Design
- **JSONB Fields**: Used for flexible storage of LLM outputs (strengths, concerns)
- **Status Enum**: String-based status for readability and debugging
- **Timestamps**: All entities have created_at/updated_at for auditing
- **Indexes**: Strategic indexes on frequently queried fields

### 5. File Storage
- **Local Storage**: Files saved to `uploads/` directory with UUID filenames
- **Storage Key**: Format: `{uuid}-{original-filename}` to prevent collisions
- **Raw Text**: Stored in database for LLM processing (no need to read files)

---

## What Could Be Improved

### Production Enhancements
1. **Bull/BullMQ**: Replace in-memory queue with Redis-backed persistent queue
2. **S3/MinIO**: Use cloud storage for documents instead of local filesystem
3. **Multipart Upload**: Support binary file uploads instead of raw text
4. **Rate Limiting**: Implement per-workspace rate limiting for LLM calls
5. **Caching**: Add Redis cache for frequently accessed summaries

### Functionality
1. **Webhooks**: Notify when summary generation completes
2. **Batch Processing**: Generate summaries for multiple candidates at once
3. **Summary Versioning**: Track changes over time and compare versions
4. **Analytics Dashboard**: Monitor usage, success rates, and token consumption
5. **Export Options**: Export summaries as PDF or CSV

### Monitoring & Observability
1. **Structured Logging**: JSON logs for ELK stack integration
2. **Metrics**: Prometheus metrics for job processing, success rates, latency
3. **Distributed Tracing**: Track requests across services
4. **Health Checks**: Comprehensive health endpoints for database, LLM API, queue

### Testing
1. **Integration Tests**: Test full workflow with test database
2. **Load Tests**: Benchmark performance under concurrent requests
3. **Chaos Engineering**: Test failure recovery scenarios
4. **Contract Tests**: Ensure provider interface compatibility

### Security
1. **API Key Rotation**: Automatic key rotation and validation
2. **Input Sanitization**: Sanitize document text before LLM processing
3. **Encryption**: Encrypt stored documents at rest
4. **Audit Logging**: Track all access to candidate data

### Developer Experience
1. **Swagger/OpenAPI**: Auto-generated API documentation
2. **Docker Compose**: One-command setup with PostgreSQL
3. **Makefile**: Common commands for development workflow
4. **Git Hooks**: Pre-commit hooks for linting and testing

---

## Assumptions & Tradeoffs

### Part A: FastAPI Service

| Assumption | Rationale |
|------------|-----------|
| No authentication required | Keeps assessment focused on core functionality |
| UUID primary keys | Avoids collisions, good for distributed systems |
| Manual SQL migrations | More control and visibility than auto-migrations |
| Jinja2 for templating | Industry standard, matches starter code |
| Snake_case API fields | Follows Python conventions |

### Part B: NestJS Service

| Assumption | Rationale |
|------------|-----------|
| Header-based auth sufficient for demo | Simple, matches starter code pattern |
| In-memory queue acceptable for assessment | Avoids external dependencies (Redis) |
| Local file storage for development | Simplifies setup, no cloud credentials needed |
| Gemini API with fallback | Real LLM integration with graceful degradation |
| Workspace isolation via application logic | Composite foreign keys not required |

---

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Test connection
psql -U assessment_user -d assessment_db -h localhost
```

#### Migration Errors
```bash
# Revert last migration
npm run migration:revert  # For TS service
python -m app.db.run_migrations down --steps 1  # For Python service

# Check migration status
npm run migration:show  # For TS service
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :8000  # Python service
lsof -i :3000  # TS service

# Kill process
kill -9 <PID>
```

#### Gemini API Key Issues
```bash
# Test API key
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent" \
  -H "Content-Type: application/json" \
  -H "X-goog-api-key: $GEMINI_KEY" \
  -d '{"contents":[{"parts":[{"text":"Say hello"}]}]}'
```

---

## Author

**Your Name**
- GitHub: https://github.com/Tun95/apha_backend
- Email: akandetunji2@gmail.com

---

## License

This project is created for assessment purposes only.
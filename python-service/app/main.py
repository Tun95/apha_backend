from fastapi import FastAPI

from app.api import health, sample_items, briefings

app = FastAPI(title="Briefing Report Generator API", version="1.0.0")

# Include routers
app.include_router(health.router)
app.include_router(sample_items.router)
app.include_router(briefings.router)


@app.get("/")
def root():
    return {
        "message": "Briefing Report Generator API",
        "docs": "/docs",
        "endpoints": [
            "/health",
            "/sample-items",
            "/briefings",
            "/briefings/{id}",
            "/briefings/{id}/generate",
            "/briefings/{id}/html"
        ]
    }
from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.briefing import BriefingCreate, BriefingRead, BriefingList
from app.services.briefing_service import BriefingService
from app.services.report_formatter import ReportFormatter

router = APIRouter(prefix="/briefings", tags=["briefings"])


@router.post("", response_model=BriefingRead, status_code=status.HTTP_201_CREATED)
def create_briefing(
    payload: BriefingCreate,
    db: Annotated[Session, Depends(get_db)]
) -> BriefingRead:
    """Create a new briefing with key points, risks, and metrics"""
    service = BriefingService(db)
    briefing = service.create_briefing(payload)
    return BriefingRead.model_validate(briefing)


@router.get("/{briefing_id}", response_model=BriefingRead)
def get_briefing(
    briefing_id: UUID,
    db: Annotated[Session, Depends(get_db)]
) -> BriefingRead:
    """Retrieve a specific briefing by ID"""
    service = BriefingService(db)
    briefing = service.get_briefing(briefing_id)
    
    if not briefing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Briefing not found"
        )
    
    return BriefingRead.model_validate(briefing)


@router.get("", response_model=List[BriefingList])
def list_briefings(
    db: Annotated[Session, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
) -> List[BriefingList]:
    """List all briefings (paginated)"""
    service = BriefingService(db)
    briefings = service.list_briefings(skip=skip, limit=limit)
    return [BriefingList.model_validate(b) for b in briefings]

@router.post("/{briefing_id}/generate", status_code=status.HTTP_200_OK)
def generate_report(
    briefing_id: UUID,
    db: Annotated[Session, Depends(get_db)]
) -> dict:
    """Generate a report for a briefing and mark it as generated"""
    service = BriefingService(db)
    briefing = service.get_briefing(briefing_id)
    
    if not briefing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Briefing not found"
        )
    
    if briefing.generated:
        return {"message": "Report already generated", "briefing_id": str(briefing_id)}
    
    service.mark_as_generated(briefing)
    
    return {
        "message": "Report generation completed",
        "briefing_id": str(briefing_id),
        "generated_at": briefing.generated_at.isoformat() if briefing.generated_at else None
    }


@router.get("/{briefing_id}/html", response_class=HTMLResponse)
def get_report_html(
    briefing_id: UUID,
    db: Annotated[Session, Depends(get_db)]
) -> str:
    """Get the generated HTML report for a briefing"""
    service = BriefingService(db)
    briefing = service.get_briefing(briefing_id)
    
    if not briefing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Briefing not found"
        )
    
    if not briefing.generated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report has not been generated yet. Please POST to /generate first."
        )
    
    # Prepare view model and render HTML
    view_model = service.prepare_report_view(briefing)
    formatter = ReportFormatter()
    html_content = formatter.render_report(view_model)
    
    return html_content
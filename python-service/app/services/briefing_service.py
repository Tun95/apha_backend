from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.briefing import Briefing, BriefingKeyPoint, BriefingRisk, BriefingMetric
from app.schemas.briefing import BriefingCreate, ReportViewModel


class BriefingService:
    """Service layer for briefing operations"""

    def __init__(self, db: Session):
        self.db = db

    def create_briefing(self, data: BriefingCreate) -> Briefing:
        """Create a new briefing with its related data"""
        # Create main briefing record
        briefing = Briefing(
            id=uuid4(),
            company_name=data.company_name,
            ticker=data.ticker.upper(),  # Ensure uppercase
            sector=data.sector,
            analyst_name=data.analyst_name,
            summary=data.summary,
            recommendation=data.recommendation,
        )
        self.db.add(briefing)
        self.db.flush()  # Get the ID without committing

        # Add key points
        for i, point in enumerate(data.key_points):
            key_point = BriefingKeyPoint(
                id=uuid4(),
                briefing_id=briefing.id,
                point_text=point,
                display_order=i
            )
            self.db.add(key_point)

        # Add risks
        for i, risk in enumerate(data.risks):
            briefing_risk = BriefingRisk(
                id=uuid4(),
                briefing_id=briefing.id,
                risk_text=risk,
                display_order=i
            )
            self.db.add(briefing_risk)

        # Add metrics if provided
        if data.metrics:
            for i, metric in enumerate(data.metrics):
                briefing_metric = BriefingMetric(
                    id=uuid4(),
                    briefing_id=briefing.id,
                    metric_name=metric.name,
                    metric_value=metric.value,
                    display_order=i
                )
                self.db.add(briefing_metric)

        self.db.commit()
        self.db.refresh(briefing)
        return briefing

    def get_briefing(self, briefing_id: UUID) -> Optional[Briefing]:
        """Retrieve a briefing by ID with all relationships loaded"""
        query = (
            select(Briefing)
            .options(
                joinedload(Briefing.key_points),
                joinedload(Briefing.risks),
                joinedload(Briefing.metrics)
            )
            .where(Briefing.id == briefing_id)
        )
        result = self.db.execute(query)
        return result.unique().scalar_one_or_none()

    def list_briefings(self, skip: int = 0, limit: int = 100) -> List[Briefing]:
        """List all briefings (without loading relationships)"""
        query = (
            select(Briefing)
            .order_by(Briefing.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = self.db.execute(query)
        return list(result.scalars().all())

    def mark_as_generated(self, briefing: Briefing) -> None:
        """Mark a briefing as generated"""
        briefing.generated = True
        briefing.generated_at = datetime.now(timezone.utc)
        self.db.commit()

    def prepare_report_view(self, briefing: Briefing) -> ReportViewModel:
        return ReportViewModel(
            report_title=f"Briefing Report: {briefing.company_name} ({briefing.ticker})",
            company_name=briefing.company_name,
            ticker=briefing.ticker,
            sector=briefing.sector,
            analyst_name=briefing.analyst_name,
            summary=briefing.summary,
            recommendation=briefing.recommendation,
            key_points=[kp.point_text for kp in sorted(briefing.key_points, key=lambda x: x.display_order)],
            risks=[r.risk_text for r in sorted(briefing.risks, key=lambda x: x.display_order)],
            metrics=[
                {"name": m.metric_name, "value": m.metric_value}
                for m in sorted(briefing.metrics, key=lambda x: x.display_order)
            ],
            generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            report_id=str(briefing.id)
        )
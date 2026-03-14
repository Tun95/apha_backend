from datetime import datetime
import uuid
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Briefing(Base):
    __tablename__ = "briefings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    sector: Mapped[str] = mapped_column(String(100), nullable=False)
    analyst_name: Mapped[str] = mapped_column(String(100), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    generated: Mapped[bool] = mapped_column(Boolean, default=False)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    key_points: Mapped[list["BriefingKeyPoint"]] = relationship(
        back_populates="briefing",
        cascade="all, delete-orphan",
        order_by="BriefingKeyPoint.display_order"
    )
    risks: Mapped[list["BriefingRisk"]] = relationship(
        back_populates="briefing",
        cascade="all, delete-orphan",
        order_by="BriefingRisk.display_order"
    )
    metrics: Mapped[list["BriefingMetric"]] = relationship(
        back_populates="briefing",
        cascade="all, delete-orphan",
        order_by="BriefingMetric.display_order"
    )


class BriefingKeyPoint(Base):
    __tablename__ = "briefing_key_points"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    briefing_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("briefings.id", ondelete="CASCADE"))
    point_text: Mapped[str] = mapped_column(Text, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    briefing: Mapped["Briefing"] = relationship(back_populates="key_points")


class BriefingRisk(Base):
    __tablename__ = "briefing_risks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    briefing_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("briefings.id", ondelete="CASCADE"))
    risk_text: Mapped[str] = mapped_column(Text, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    briefing: Mapped["Briefing"] = relationship(back_populates="risks")


class BriefingMetric(Base):
    __tablename__ = "briefing_metrics"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    briefing_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("briefings.id", ondelete="CASCADE"))
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_value: Mapped[str] = mapped_column(String(50), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    briefing: Mapped["Briefing"] = relationship(back_populates="metrics")

    __table_args__ = (
        UniqueConstraint('briefing_id', 'metric_name', name='unique_metric_per_briefing'),
    )
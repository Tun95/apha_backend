from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MetricBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    value: str = Field(..., min_length=1, max_length=50)


class MetricCreate(MetricBase):
    pass


class MetricRead(MetricBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    display_order: int


class KeyPointBase(BaseModel):
    point: str = Field(..., min_length=1)


class KeyPointCreate(KeyPointBase):
    pass


class KeyPointRead(KeyPointBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    display_order: int


class RiskBase(BaseModel):
    risk: str = Field(..., min_length=1)


class RiskCreate(RiskBase):
    pass


class RiskRead(RiskBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    display_order: int


class BriefingBase(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255, alias="companyName")
    ticker: str = Field(..., min_length=1, max_length=10)
    sector: str = Field(..., min_length=1, max_length=100)
    analyst_name: str = Field(..., min_length=1, max_length=100, alias="analystName")
    summary: str = Field(..., min_length=1)
    recommendation: str = Field(..., min_length=1)

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=None
    )

    @field_validator('ticker')
    def uppercase_ticker(cls, v: str) -> str:
        return v.upper()


class BriefingCreate(BriefingBase):
    key_points: List[str] = Field(..., min_length=2, alias="keyPoints")
    risks: List[str] = Field(..., min_length=1, alias="risks")
    metrics: Optional[List[MetricCreate]] = Field(default_factory=list, alias="metrics")

    @field_validator('key_points')
    def validate_key_points(cls, v: List[str]) -> List[str]:
        if len(v) < 2:
            raise ValueError('At least 2 key points are required')
        return v

    @field_validator('risks')
    def validate_risks(cls, v: List[str]) -> List[str]:
        if len(v) < 1:
            raise ValueError('At least 1 risk is required')
        return v

    @field_validator('metrics')
    def validate_unique_metric_names(cls, v: Optional[List[MetricCreate]]) -> Optional[List[MetricCreate]]:
        if v:
            names = [m.name for m in v]
            if len(names) != len(set(names)):
                raise ValueError('Metric names must be unique within the briefing')
        return v

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=None
    )


class BriefingRead(BriefingBase):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

    id: UUID
    generated: bool
    generated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    key_points: List[KeyPointRead] = Field(alias="keyPoints")
    risks: List[RiskRead] = Field(alias="risks")
    metrics: List[MetricRead] = Field(alias="metrics")


class BriefingList(BaseModel):
    id: UUID
    company_name: str = Field(alias="companyName")
    ticker: str
    analyst_name: str = Field(alias="analystName")
    generated: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )


class ReportViewModel(BaseModel):
    """View model for the HTML report"""
    report_title: str
    company_name: str
    ticker: str
    sector: str
    analyst_name: str
    summary: str
    recommendation: str
    key_points: List[str]
    risks: List[str]
    metrics: List[dict[str, str]]
    generated_at: str
    report_id: str
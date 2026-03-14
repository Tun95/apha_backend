from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.schemas.briefing import ReportViewModel

_TEMPLATE_DIR = Path(__file__).resolve().parents[1] / "templates"


class ReportFormatter:
    """Formats briefing data into HTML reports using Jinja2 templates"""

    def __init__(self) -> None:
        self._env = Environment(
            loader=FileSystemLoader(str(_TEMPLATE_DIR)),
            autoescape=select_autoescape(enabled_extensions=("html", "xml"), default_for_string=True),
        )

    def render_report(self, view_model: ReportViewModel) -> str:
        """Render a complete briefing report"""
        template = self._env.get_template("briefing_report.html")
        return template.render(
            report=view_model,
            generated_at=view_model.generated_at
        )

    @staticmethod
    def generated_timestamp() -> str:
        return datetime.now(timezone.utc).isoformat()
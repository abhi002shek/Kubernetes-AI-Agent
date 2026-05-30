import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger
from services.investigation import run_investigation
from services.insforge_client import publish_progress, save_investigation
from services.slack import notify_slack
from ai import analyze

router = APIRouter()


class InvestigateRequest(BaseModel):
    user_id: str | None = None
    context: str | None = None
    namespace: str | None = None


@router.post("/investigate")
def investigate(body: InvestigateRequest = InvestigateRequest()):
    investigation_id = str(uuid.uuid4())
    try:
        investigation = run_investigation(investigation_id, context=body.context, namespace=body.namespace)

        publish_progress(investigation_id, "AI Reasoning")
        diagnosis = analyze(investigation)

        publish_progress(investigation_id, "Root Cause Found", status="completed")

        if body.user_id:
            save_investigation(body.user_id, diagnosis)

        notify_slack(diagnosis, context=body.context, namespace=body.namespace)

        return {
            "status": "success",
            "investigation_id": investigation_id,
            "investigation": investigation,
            "diagnosis": diagnosis,
        }
    except Exception as e:
        logger.error(f"Investigation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

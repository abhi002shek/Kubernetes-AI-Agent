import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from loguru import logger
from services.investigation import run_investigation
from services.insforge_client import (
    record_progress_step,
    create_investigation,
    complete_investigation,
    fail_investigation,
)
from services.slack import notify_slack
from ai import analyze
from api.deps import get_current_user

router = APIRouter()


class InvestigateRequest(BaseModel):
    investigation_id: str | None = None
    context: str | None = None
    namespace: str | None = None


@router.post("/investigate")
def investigate(
    body: InvestigateRequest = InvestigateRequest(),
    user: dict = Depends(get_current_user),
):
    user_id = user["id"]
    investigation_id = body.investigation_id or str(uuid.uuid4())
    ns = body.namespace or "all"

    create_investigation(investigation_id, user_id, body.context, ns)

    try:
        investigation = run_investigation(investigation_id, context=body.context, namespace=body.namespace)

        record_progress_step(investigation_id, "AI Reasoning")
        diagnosis = analyze(investigation)

        record_progress_step(investigation_id, "Root Cause Found", status="completed")

        complete_investigation(investigation_id, diagnosis, body.context, ns)

        notify_slack(diagnosis, context=body.context, namespace=body.namespace)

        return {
            "status": "success",
            "investigation_id": investigation_id,
            "investigation": investigation,
            "diagnosis": diagnosis,
        }
    except Exception as e:
        logger.error(f"Investigation failed: {e}")
        fail_investigation(investigation_id, str(e))
        raise HTTPException(status_code=500, detail=str(e))

import os
import httpx
from loguru import logger

INSFORGE_URL = os.getenv("INSFORGE_URL", "")
API_KEY = os.getenv("INSFORGE_API_KEY", "")


def _headers():
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


def publish_progress(investigation_id: str, step: str, status: str = "running"):
    if not INSFORGE_URL or not API_KEY:
        return
    try:
        with httpx.Client(timeout=5) as client:
            client.post(
                f"{INSFORGE_URL}/api/realtime/publish",
                headers=_headers(),
                json={
                    "channel": f"investigation:{investigation_id}",
                    "event": "progress",
                    "payload": {"step": step, "status": status},
                },
            )
    except Exception as e:
        logger.warning(f"Realtime publish failed: {e}")


def record_progress_step(investigation_id: str, step: str, status: str = "completed"):
    """Persist a progress step (service role — bypasses RLS)."""
    if not INSFORGE_URL or not API_KEY:
        return
    publish_progress(investigation_id, step, status)
    try:
        with httpx.Client(timeout=10) as client:
            r = client.post(
                f"{INSFORGE_URL}/api/database/records/investigation_progress",
                headers=_headers(),
                json=[{
                    "investigation_id": investigation_id,
                    "step": step,
                    "status": status,
                }],
            )
            if r.status_code >= 400:
                logger.warning(f"Progress step save failed: {r.status_code} {r.text}")
    except Exception as e:
        logger.warning(f"Progress step save failed: {e}")


def create_investigation(
    investigation_id: str,
    user_id: str,
    context: str | None = None,
    namespace: str | None = None,
) -> bool:
    if not INSFORGE_URL or not API_KEY:
        return False
    try:
        with httpx.Client(timeout=10) as client:
            r = client.post(
                f"{INSFORGE_URL}/api/database/records/investigations",
                headers=_headers(),
                json=[{
                    "id": investigation_id,
                    "user_id": user_id,
                    "status": "running",
                    "context": context,
                    "namespace": namespace or "all",
                }],
            )
            if r.status_code >= 400:
                logger.warning(f"Create investigation failed: {r.status_code} {r.text}")
                return False
            logger.info(f"Investigation {investigation_id} created")
            return True
    except Exception as e:
        logger.warning(f"Create investigation failed: {e}")
        return False


def complete_investigation(
    investigation_id: str,
    diagnosis: dict,
    context: str | None = None,
    namespace: str | None = None,
):
    if not INSFORGE_URL or not API_KEY:
        return
    try:
        payload = {
            "root_cause": diagnosis.get("root_cause", ""),
            "confidence": diagnosis.get("confidence", 0),
            "status": "completed",
            "diagnosis": diagnosis,
        }
        if context is not None:
            payload["context"] = context
        if namespace is not None:
            payload["namespace"] = namespace

        with httpx.Client(timeout=10) as client:
            r = client.patch(
                f"{INSFORGE_URL}/api/database/records/investigations",
                headers=_headers(),
                params={"id": f"eq.{investigation_id}"},
                json=payload,
            )
            if r.status_code >= 400:
                logger.warning(f"Complete investigation failed: {r.status_code} {r.text}")
            else:
                logger.info("Investigation completed in DB")
    except Exception as e:
        logger.warning(f"Complete investigation failed: {e}")


def fail_investigation(investigation_id: str, message: str):
    if not INSFORGE_URL or not API_KEY:
        return
    try:
        with httpx.Client(timeout=10) as client:
            client.patch(
                f"{INSFORGE_URL}/api/database/records/investigations",
                headers=_headers(),
                params={"id": f"eq.{investigation_id}"},
                json={"status": "failed", "root_cause": message},
            )
    except Exception as e:
        logger.warning(f"Fail investigation update failed: {e}")


def save_investigation(user_id: str, diagnosis: dict, context: str | None = None, namespace: str | None = None):
    """Legacy insert-only save (used when no investigation_id lifecycle)."""
    if not INSFORGE_URL or not API_KEY:
        return
    try:
        with httpx.Client(timeout=10) as client:
            r = client.post(
                f"{INSFORGE_URL}/api/database/records/investigations",
                headers=_headers(),
                json=[{
                    "user_id": user_id,
                    "root_cause": diagnosis.get("root_cause", ""),
                    "confidence": diagnosis.get("confidence", 0),
                    "status": "completed",
                    "diagnosis": diagnosis,
                    "context": context,
                    "namespace": namespace or "all",
                }],
            )
            if r.status_code >= 400:
                logger.warning(f"Save investigation failed: {r.status_code} {r.text}")
            else:
                logger.info("Investigation saved to DB")
    except Exception as e:
        logger.warning(f"Save investigation failed: {e}")

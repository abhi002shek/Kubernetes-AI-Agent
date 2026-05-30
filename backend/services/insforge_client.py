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


def save_investigation(user_id: str, diagnosis: dict):
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
                }],
            )
            if r.status_code >= 400:
                logger.warning(f"Save investigation failed: {r.status_code} {r.text}")
            else:
                logger.info("Investigation saved to DB")
    except Exception as e:
        logger.warning(f"Save investigation failed: {e}")

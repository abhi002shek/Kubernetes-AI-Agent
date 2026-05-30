import os
import httpx
from loguru import logger


def notify_slack(diagnosis: dict, context: str | None = None, namespace: str | None = None):
    webhook_url = os.getenv("SLACK_WEBHOOK_URL", "")
    if not webhook_url:
        return

    confidence = diagnosis.get("confidence", 0)
    root_cause = diagnosis.get("root_cause", "Unknown")
    fix = diagnosis.get("fix", "")
    emoji = "🔴" if confidence >= 70 else "🟡"

    cluster_info = f"`{context}`" if context else "default cluster"
    ns_info = f" / namespace `{namespace}`" if namespace else ""

    text = (
        f"{emoji} *Kubernetes Issue Detected* — {cluster_info}{ns_info}\n"
        f"*Root Cause:* {root_cause}\n"
        f"*Fix:* {fix}\n"
        f"*Confidence:* {confidence}%"
    )

    try:
        with httpx.Client(timeout=5) as client:
            r = client.post(webhook_url, json={"text": text})
            if r.status_code == 200:
                logger.info("Slack notification sent")
            else:
                logger.warning(f"Slack notification failed: {r.status_code}")
    except Exception as e:
        logger.warning(f"Slack notification error: {e}")

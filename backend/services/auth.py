import os
import httpx
from loguru import logger

INSFORGE_URL = os.getenv("INSFORGE_URL", "").rstrip("/")


def verify_access_token(token: str) -> dict | None:
    """
    Validate a user JWT by calling InsForge.
    Returns the user dict on success, or None if invalid/expired.
    """
    if not INSFORGE_URL or not token:
        return None

    try:
        with httpx.Client(timeout=10) as client:
            r = client.get(
                f"{INSFORGE_URL}/api/auth/sessions/current",
                headers={"Authorization": f"Bearer {token}"},
            )
            if r.status_code != 200:
                logger.warning(f"Token verification failed: {r.status_code}")
                return None

            data = r.json()
            user = data.get("user")
            if not user or not user.get("id"):
                return None

            if user.get("emailVerified") is False:
                logger.warning("Token valid but email not verified")
                return None

            return user
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return None

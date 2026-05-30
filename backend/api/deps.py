from fastapi import Header, HTTPException
from services.auth import verify_access_token


def get_current_user(authorization: str | None = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Sign in and retry.",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")

    user = verify_access_token(token)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session. Please sign in again.",
        )

    return user

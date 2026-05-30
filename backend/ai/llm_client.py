import os
import httpx
from loguru import logger

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def call_llm(system_prompt: str, user_prompt: str) -> str:
    """Call OpenRouter LLM and return the response text."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-r1-0528:free")

    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is not set")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }

    for attempt in range(3):
        try:
            with httpx.Client(timeout=60) as client:
                response = client.post(
                    OPENROUTER_URL,
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json=payload,
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                logger.info(f"LLM response received (attempt {attempt + 1})")
                return content
        except httpx.TimeoutException:
            logger.warning(f"LLM timeout on attempt {attempt + 1}")
        except httpx.HTTPStatusError as e:
            logger.error(f"LLM HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"LLM error on attempt {attempt + 1}: {e}")
            if attempt == 2:
                raise

    raise RuntimeError("LLM call failed after 3 attempts")

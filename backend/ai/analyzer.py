import json
import re
from loguru import logger
from .prompt_builder import SYSTEM_PROMPT, build_prompt
from .llm_client import call_llm


def analyze(investigation: dict) -> dict:
    """Send investigation data to LLM and return structured diagnosis."""
    user_prompt = build_prompt(investigation)
    logger.info("Sending investigation to AI agent")

    raw = call_llm(SYSTEM_PROMPT, user_prompt)

    # Strip markdown code fences if present
    cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()

    try:
        diagnosis = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("LLM returned non-JSON, wrapping as raw explanation")
        diagnosis = {
            "root_cause": "Unable to parse structured response",
            "explanation": cleaned[:500],
            "fix": "Review the raw explanation above",
            "kubectl_commands": [],
            "prevention": "",
            "confidence": 0,
        }

    logger.info(f"Diagnosis complete. Confidence: {diagnosis.get('confidence')}%")
    return diagnosis

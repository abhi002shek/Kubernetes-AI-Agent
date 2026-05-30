from loguru import logger
from .kubectl import run_kubectl


def analyze_events(namespace: str | None = None, context: str | None = None) -> dict:
    ns_args = ["-n", namespace] if namespace else ["-A"]
    result = run_kubectl(["get", "events", *ns_args, "--sort-by=.lastTimestamp", "--no-headers"], context=context)
    if not result["success"]:
        return {"warnings": [], "error": result["stderr"]}

    warnings = []
    for line in result["stdout"].splitlines():
        parts = line.split()
        if "Warning" in parts:
            idx = parts.index("Warning")
            reason = parts[idx + 1] if idx + 1 < len(parts) else "Unknown"
            obj = parts[idx + 2] if idx + 2 < len(parts) else ""
            message = " ".join(parts[idx + 3:]) if idx + 3 < len(parts) else ""
            warnings.append({"reason": reason, "object": obj, "message": message})

    logger.info(f"Events: {len(warnings)} warnings")
    return {"warnings": warnings, "total_warnings": len(warnings)}

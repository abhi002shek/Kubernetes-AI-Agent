from loguru import logger
from .kubectl import run_kubectl

ERROR_KEYWORDS = ["error", "exception", "fatal", "failed", "refused",
                  "missing", "not found", "crashloop", "oomkilled", "timeout"]


def collect_logs(problematic_pods: list[dict], context: str | None = None, tail: int = 50) -> dict:
    logs = {}
    for pod in problematic_pods[:5]:
        name, namespace = pod["name"], pod["namespace"]
        result = run_kubectl(["logs", name, "-n", namespace, f"--tail={tail}", "--previous"],
                             timeout=15, context=context)
        if not result["success"]:
            result = run_kubectl(["logs", name, "-n", namespace, f"--tail={tail}"],
                                 timeout=15, context=context)

        raw = result["stdout"] or result["stderr"]
        relevant = [l for l in raw.splitlines() if any(k in l.lower() for k in ERROR_KEYWORDS)]
        logs[f"{namespace}/{name}"] = relevant or raw.splitlines()[-10:] if raw else ["no logs available"]
        logger.info(f"Collected logs for {namespace}/{name}: {len(relevant)} relevant lines")

    return {"pod_logs": logs}

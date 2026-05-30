from loguru import logger
from .kubectl import run_kubectl

UNHEALTHY_STATES = {"CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull",
                    "Pending", "Error", "OOMKilled", "ContainerCreating", "Terminating"}


def inspect_pods(namespace: str | None = None, context: str | None = None) -> dict:
    ns_args = ["-n", namespace] if namespace else ["-A"]
    result = run_kubectl(["get", "pods", *ns_args, "--no-headers"], context=context)
    if not result["success"]:
        return {"healthy": True, "problematic_pods": [], "error": result["stderr"]}

    problematic = []
    for line in result["stdout"].splitlines():
        parts = line.split()
        if len(parts) < 4:
            continue
        if namespace:
            name, ready, status = parts[0], parts[1], parts[2]
            ns = namespace
        else:
            ns, name, ready, status = parts[0], parts[1], parts[2], parts[3]
        if any(state in status for state in UNHEALTHY_STATES):
            problematic.append({"name": name, "namespace": ns, "status": status, "ready": ready})

    logger.info(f"Pod inspection: {len(problematic)} problematic pods")
    return {"healthy": len(problematic) == 0, "problematic_pods": problematic}

from loguru import logger
from .kubectl import run_kubectl


def inspect_deployments(namespace: str | None = None, context: str | None = None) -> dict:
    ns_args = ["-n", namespace] if namespace else ["-A"]
    result = run_kubectl(["get", "deployments", *ns_args, "--no-headers"], context=context)
    if not result["success"]:
        return {"unhealthy_deployments": [], "error": result["stderr"]}

    unhealthy = []
    for line in result["stdout"].splitlines():
        parts = line.split()
        if len(parts) < 3:
            continue
        if namespace:
            name, ready = parts[0], parts[1]
            ns = namespace
        else:
            ns, name, ready = parts[0], parts[1], parts[2]
        try:
            available, desired = map(int, ready.split("/"))
            if available < desired:
                unhealthy.append({"name": name, "namespace": ns, "ready": ready,
                                  "issue": f"Only {available}/{desired} replicas available"})
        except ValueError:
            pass

    logger.info(f"Deployments: {len(unhealthy)} unhealthy")
    return {"healthy": len(unhealthy) == 0, "unhealthy_deployments": unhealthy}

from loguru import logger
from .kubectl import run_kubectl


def inspect_network(namespace: str | None = None, context: str | None = None) -> dict:
    ns_args = ["-n", namespace] if namespace else ["-A"]
    svc_result = run_kubectl(["get", "svc", *ns_args, "--no-headers"], context=context)
    ep_result = run_kubectl(["get", "endpoints", *ns_args, "--no-headers"], context=context)

    services = []
    if svc_result["success"]:
        for line in svc_result["stdout"].splitlines():
            parts = line.split()
            if len(parts) >= 3:
                if namespace:
                    services.append({"namespace": namespace, "name": parts[0], "type": parts[1]})
                else:
                    services.append({"namespace": parts[0], "name": parts[1], "type": parts[2]})

    missing_endpoints = []
    if ep_result["success"]:
        for line in ep_result["stdout"].splitlines():
            parts = line.split()
            if namespace:
                if len(parts) >= 2 and (len(parts) < 3 or parts[1] == "<none>"):
                    missing_endpoints.append({"namespace": namespace, "name": parts[0],
                                              "issue": "No endpoints — possible selector mismatch"})
            else:
                if len(parts) >= 3 and parts[2] == "<none>":
                    missing_endpoints.append({"namespace": parts[0], "name": parts[1],
                                              "issue": "No endpoints — possible selector mismatch"})

    logger.info(f"Network: {len(services)} services, {len(missing_endpoints)} missing endpoints")
    return {"services": services, "missing_endpoints": missing_endpoints, "healthy": len(missing_endpoints) == 0}

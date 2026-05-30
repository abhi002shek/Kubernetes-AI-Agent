from loguru import logger
from .kubectl import run_kubectl


def inspect_pvcs(namespace: str | None = None, context: str | None = None) -> dict:
    ns_args = ["-n", namespace] if namespace else ["-A"]
    result = run_kubectl(["get", "pvc", *ns_args, "--no-headers"], context=context)
    if not result["success"]:
        return {"pvcs": [], "unhealthy_pvcs": [], "error": result["stderr"]}

    pvcs = []
    unhealthy = []
    for line in result["stdout"].splitlines():
        parts = line.split()
        if len(parts) < 3:
            continue
        # With -A: namespace name status ...
        # With -n ns: name status ...
        if namespace:
            name, status = parts[0], parts[1]
            ns = namespace
        else:
            ns, name, status = parts[0], parts[1], parts[2]
        pvc = {"namespace": ns, "name": name, "status": status}
        pvcs.append(pvc)
        if status != "Bound":
            unhealthy.append({**pvc, "issue": f"PVC is {status} — storage may be unavailable"})

    logger.info(f"PVC inspection: {len(pvcs)} PVCs, {len(unhealthy)} unhealthy")
    return {"pvcs": pvcs, "unhealthy_pvcs": unhealthy, "healthy": len(unhealthy) == 0}

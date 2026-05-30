from loguru import logger
from .kubectl import run_kubectl


def inspect_nodes(context: str | None = None) -> dict:
    result = run_kubectl(["get", "nodes", "--no-headers"], context=context)
    if not result["success"]:
        return {"nodes": [], "unhealthy_nodes": [], "error": result["stderr"]}

    nodes = []
    unhealthy = []
    for line in result["stdout"].splitlines():
        parts = line.split()
        if len(parts) < 2:
            continue
        name, status = parts[0], parts[1]
        node = {"name": name, "status": status}
        if len(parts) >= 5:
            node["roles"] = parts[2]
            node["age"] = parts[3]
            node["version"] = parts[4]
        nodes.append(node)
        if status != "Ready":
            unhealthy.append(node)

    logger.info(f"Node inspection: {len(nodes)} nodes, {len(unhealthy)} unhealthy")
    return {"nodes": nodes, "unhealthy_nodes": unhealthy, "healthy": len(unhealthy) == 0}

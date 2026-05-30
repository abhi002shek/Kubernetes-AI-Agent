from fastapi import APIRouter
from kubernetes.kubectl import run_kubectl

router = APIRouter()


@router.get("/clusters")
def list_clusters():
    """List all available kubectl contexts from kubeconfig."""
    result = run_kubectl(["config", "get-contexts", "--no-headers", "-o", "name"])
    if not result["success"] or not result["stdout"]:
        return {"clusters": []}

    # Get current context
    current = run_kubectl(["config", "current-context"])
    current_ctx = current["stdout"].strip() if current["success"] else ""

    clusters = []
    for name in result["stdout"].splitlines():
        name = name.strip()
        if name:
            clusters.append({"name": name, "current": name == current_ctx})

    return {"clusters": clusters}

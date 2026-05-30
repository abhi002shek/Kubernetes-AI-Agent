from fastapi import APIRouter, Query
from kubernetes.kubectl import run_kubectl

router = APIRouter()


@router.get("/namespaces")
def list_namespaces(context: str = Query(default="")):
    result = run_kubectl(["get", "namespaces", "--no-headers", "-o", "custom-columns=NAME:.metadata.name"],
                         context=context or None)
    if not result["success"] or not result["stdout"]:
        return {"namespaces": ["default"]}
    namespaces = [n.strip() for n in result["stdout"].splitlines() if n.strip()]
    return {"namespaces": namespaces}

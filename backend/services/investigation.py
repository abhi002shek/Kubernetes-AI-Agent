import uuid
from loguru import logger
from kubernetes import inspect_pods, collect_logs, analyze_events, inspect_deployments, inspect_network, inspect_nodes, inspect_pvcs
from services.insforge_client import publish_progress


def run_investigation(investigation_id: str | None = None, context: str | None = None, namespace: str | None = None) -> dict:
    if not investigation_id:
        investigation_id = str(uuid.uuid4())

    logger.info(f"Starting investigation {investigation_id} context={context or 'default'} namespace={namespace or 'all'}")

    publish_progress(investigation_id, "Checking Pods")
    pods = inspect_pods(namespace=namespace, context=context)

    publish_progress(investigation_id, "Reading Logs")
    logs = collect_logs(pods.get("problematic_pods", []), context=context)

    publish_progress(investigation_id, "Analyzing Events")
    events = analyze_events(namespace=namespace, context=context)

    publish_progress(investigation_id, "Inspecting Deployments")
    deployments = inspect_deployments(namespace=namespace, context=context)

    publish_progress(investigation_id, "Checking Networking")
    network = inspect_network(namespace=namespace, context=context)

    publish_progress(investigation_id, "Checking Nodes")
    nodes = inspect_nodes(context=context)

    publish_progress(investigation_id, "Checking Storage")
    pvcs = inspect_pvcs(namespace=namespace, context=context)

    logger.info("Investigation complete")
    return {
        "investigation_id": investigation_id,
        "context": context,
        "namespace": namespace or "all",
        "pods": pods,
        "logs": logs,
        "events": events,
        "deployments": deployments,
        "network": network,
        "nodes": nodes,
        "pvcs": pvcs,
    }

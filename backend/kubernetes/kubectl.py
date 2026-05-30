import subprocess
from loguru import logger


def run_kubectl(args: list[str], timeout: int = 30, context: str | None = None) -> dict:
    """Execute a kubectl command and return structured output."""
    cmd = ["kubectl"]
    if context:
        cmd += ["--context", context]
    cmd += args

    logger.info(f"Running: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        logger.error(f"kubectl timed out: {cmd}")
        return {"success": False, "stdout": "", "stderr": "Command timed out", "returncode": -1}
    except FileNotFoundError:
        logger.error("kubectl not found in PATH")
        return {"success": False, "stdout": "", "stderr": "kubectl not found", "returncode": -1}
    except Exception as e:
        logger.error(f"kubectl error: {e}")
        return {"success": False, "stdout": "", "stderr": str(e), "returncode": -1}

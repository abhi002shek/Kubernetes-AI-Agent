from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from dotenv import load_dotenv
from api.investigate import router as investigate_router
from api.clusters import router as clusters_router
from api.namespaces import router as namespaces_router

load_dotenv()

app = FastAPI(title="AI Kubernetes Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(investigate_router)
app.include_router(clusters_router)
app.include_router(namespaces_router)


@app.get("/health")
def health():
    logger.info("Health check")
    return {"status": "healthy", "service": "ai-kubernetes-agent"}

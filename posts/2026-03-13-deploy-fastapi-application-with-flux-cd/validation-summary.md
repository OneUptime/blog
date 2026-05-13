# Validation Summary: How to Deploy a FastAPI Application with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- FastAPI
- Python
- Uvicorn
- Gunicorn
- Docker
- Kubernetes Deployments, Services, probes, Secrets, and HorizontalPodAutoscaler
- Flux CD GitRepository, Kustomization, ImageRepository, ImagePolicy, and ImageUpdateAutomation
- Pydantic settings

## Sources Consulted
- FastAPI deployment workers documentation: https://fastapi.tiangolo.com/deployment/server-workers/
- FastAPI settings documentation: https://fastapi.tiangolo.com/advanced/settings/
- Uvicorn deployment documentation: https://uvicorn.dev/deployment/
- uvicorn-worker package documentation: https://pypi.org/project/uvicorn-worker/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageUpdateAutomation API documentation: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux ImageUpdateAutomation component documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Kubernetes liveness/readiness/startup probe documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- PyPI package metadata for FastAPI, Uvicorn, Gunicorn, Pydantic, and uvicorn-worker: https://pypi.org/

## Issues Found
- The post used `uvicorn.workers.UvicornWorker`, which current Uvicorn documentation marks as deprecated. Updated the text and Dockerfile to use the separate `uvicorn-worker` package and `uvicorn_worker.UvicornWorker`.
- The requirements block pinned older package versions and became incompatible after switching to `uvicorn-worker==0.4.0`, which requires `uvicorn>=0.36.0`. Updated the sample pins to current compatible versions: FastAPI 0.136.1, Uvicorn 0.46.0, Gunicorn 26.0.0, Pydantic 2.13.4, and uvicorn-worker 0.4.0.
- The Flux ImageUpdateAutomation commit template used `.Updated.Images`, but Flux v1 removed the `Updated` template data and marks automations using it as stalled. Updated the template to use `.Changed.Changes`.
- The FastAPI app initialization used `docs_url="/docs" if not False else None`, which always enables `/docs` despite the comment implying conditional disabling. Simplified it to `docs_url="/docs"` and changed the comment to accurately describe how to disable docs.
- The Deployment referenced a `fastapi-secrets` Secret that was not listed as a prerequisite. Added a prerequisite for a `fastapi-secrets` Secret in the `my-fastapi-app` namespace with a `DATABASE_URL` key, or GitOps-friendly secret management such as SOPS.
- The pod annotations enabled Prometheus scraping at `/metrics`, but the sample app did not expose a `/metrics` endpoint. Removed the annotations so the manifest matches the application shown; the best-practice note about adding `prometheus-fastapi-instrumentator` remains accurate.
- The Pydantic settings best-practice note referred to Pydantic `BaseSettings` directly. Updated it to name the `pydantic-settings` package, which is the correct package for Pydantic v2 settings.

## Review Notes
- The Python code block parses successfully, and all Kubernetes/Flux YAML blocks parse as valid multi-document YAML after the edits.
- The Flux image policy marker on the Deployment image is valid for updating a fully qualified container image reference.
- The HPA manifest uses `autoscaling/v2` and defines CPU requests, which are required for CPU utilization-based scaling to work.

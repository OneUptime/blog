# Validation Summary: How to Deploy a FastAPI Application to Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Apps
- Azure Container Registry
- Azure CLI
- FastAPI
- Pydantic
- Uvicorn
- Docker
- Python

## Sources Consulted
- Azure Container Apps scaling documentation: https://learn.microsoft.com/en-us/azure/container-apps/scale-app
- Azure Container Apps CLI reference: https://learn.microsoft.com/en-us/cli/azure/containerapp
- Azure Container Apps secrets documentation: https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets
- Azure Container Apps revision management documentation: https://learn.microsoft.com/en-us/azure/container-apps/revisions-manage
- Azure Container Registry CLI quickstart: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-get-started-azure-cli
- Azure Container Registry CLI reference: https://learn.microsoft.com/en-us/cli/azure/acr
- FastAPI OpenAPI docs reference: https://fastapi.tiangolo.com/reference/openapi/docs/
- Pydantic BaseModel API documentation: https://docs.pydantic.dev/latest/api/base_model/
- Uvicorn deployment documentation: https://www.uvicorn.org/deployment/

## Issues Found
- The sample used `--workers 2` while storing application data in an in-memory dictionary. Uvicorn workers are separate processes, so the dictionary would not be shared between workers. Changed the Docker command to use one worker and clarified that the in-memory storage is demo-only.
- The Azure Container Registry example used a fixed registry name without noting that ACR names must be globally unique. Added a sentence telling readers to replace `myfastapiregistry` with a globally unique name.
- The scaling diagram implied a hard scale-down threshold of fewer than 5 requests per instance. Azure Container Apps uses the configured target concurrency and scale behavior/stabilization rather than that explicit threshold. Updated the diagram wording.
- The environment variable example referenced `secretref:db-url` before creating the `db-url` secret. Reordered the commands so the secret is created first.
- The rollback example used `bookstore-api--v1` as a revision name, but actual revision names should come from `az containerapp revision list` unless explicitly configured. Replaced it with `<REVISION_NAME_FROM_LIST>`.

## Review Notes
- The tutorial remains a demo-oriented deployment guide. For production, the bookstore API would need durable external storage because Azure Container Apps replicas are ephemeral and scale independently.
- The ACR admin-user/password flow is valid for the shown commands, but managed identity or scoped tokens would usually be preferable for production deployments.

# Validation Summary: How to Deploy a Multi-Container App to Azure App Service Using Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service on Linux
- Docker Compose
- Azure Container Registry
- Azure CLI
- Node.js
- Express
- Redis
- Azure/App Service persistent storage

## Sources Consulted
- Microsoft Learn: Configure a custom container for Azure App Service: https://learn.microsoft.com/azure/app-service/configure-custom-container
- Microsoft Learn: Azure App Service on Linux FAQ: https://learn.microsoft.com/troubleshoot/azure/app-service/faqs-app-service-linux-new
- Microsoft Learn: Configure CI/CD for custom containers in Azure App Service: https://learn.microsoft.com/azure/app-service/deploy-ci-cd-custom-container
- Microsoft Learn: Mount Azure Storage as a local share in Azure App Service: https://learn.microsoft.com/azure/app-service/configure-connect-to-azure-storage
- Microsoft Learn: Azure CLI `az webapp config container`: https://learn.microsoft.com/cli/azure/webapp/config/container
- Microsoft Learn: Azure CLI `az webapp config storage-account`: https://learn.microsoft.com/cli/azure/webapp/config/storage-account
- Docker Docs: Control startup and shutdown order in Compose: https://docs.docker.com/compose/how-tos/startup-order/
- npm Docs: `npm ci`: https://docs.npmjs.com/cli/commands/npm-ci/
- Redis Docs: Node Redis client connection guide: https://redis.io/docs/latest/develop/clients/nodejs/connect/

## Issues Found
- The post did not mention Microsoft's announced retirement date for the App Service Docker Compose feature. Added the March 31, 2027 retirement caveat.
- The support matrix incorrectly listed `depends_on` as supported. Updated it to say App Service ignores `depends_on`, and adjusted the startup-order guidance.
- The support matrix and persistence section implied custom Azure Storage mounts were the correct Docker Compose persistence path. Replaced the `az webapp config storage-account add` flow with the documented `WEBSITES_ENABLE_APP_SERVICE_STORAGE=TRUE` and `${WEBAPP_STORAGE_HOME}` approach.
- The Compose examples exposed Redis port `6379`, which App Service ignores because only ports `80` and `8080` are supported for external access. Removed the Redis port mapping from the App Service compose examples.
- The inter-container communication section mixed App Service sidecar networking language with Docker Compose behavior. Updated it to recommend service-name hostnames and note that custom Docker networks are ignored.
- The Node.js sample connected to Redis once at startup even though App Service ignores `depends_on`. Added retry logic and started the HTTP server after Redis connects.
- The local test command used `docker compose up --build`, but the Compose file uses a prebuilt image tag rather than a `build` directive. Updated the local test flow to build the tagged image first, then run `docker compose up`.
- The Dockerfile used `npm ci --only=production`; updated it to the current `npm ci --omit=dev` form.

## Review Notes
The post is now technically accurate for Azure App Service Docker Compose as documented on June 1, 2026. Docker Compose support on App Service is still a legacy/retiring path; future revisions should consider a sidecar-container version of the tutorial.

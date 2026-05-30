# Validation Summary: How to Set Up Azure Pipelines to Build and Push Docker Images to Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Pipelines
- Azure Container Registry
- Azure CLI
- Docker and Dockerfile multi-stage builds
- Docker@2 Azure Pipelines task
- AzureCLI@2 Azure Pipelines task
- Trivy vulnerability scanner
- Node.js container builds

## Sources Consulted
- Microsoft Learn: Use Azure Pipelines to build and push container images to registries - https://learn.microsoft.com/en-us/azure/devops/pipelines/ecosystems/containers/push-image
- Microsoft Learn: Docker@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2
- Microsoft Learn: Service connections in Azure Pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints
- Microsoft Learn: Create a service connection and publish Docker images to Azure Container Registry - https://learn.microsoft.com/en-us/azure/devops/pipelines/ecosystems/containers/publish-to-acr
- Microsoft Learn: Azure CLI az acr command reference - https://learn.microsoft.com/en-us/cli/azure/acr
- Microsoft Learn: jobs.job.strategy schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs-job-strategy
- Trivy documentation: Installation - https://trivy.dev/docs/latest/getting-started/installation/
- Trivy documentation: Image scanning CLI options - https://trivy.dev/docs/references/configuration/cli/trivy_image/

## Issues Found
- The Docker layer caching example pulled `myappregistry.azurecr.io/myapp/web:latest` before authenticating to ACR. Because ACR is normally private, the pull would fail and the cache would not be used. Added a Docker@2 `login` step before the pull.
- The Trivy installation snippet used `apt-key` and a distribution-specific repository path. Trivy's current official Debian/Ubuntu installation instructions use a dearmored keyring with `signed-by` and the `generic` repository. Updated the snippet accordingly.

## Review Notes
The Azure Pipelines Docker@2 examples, ACR creation command, service connection guidance, ACR Tasks `az acr build` command, matrix strategy example, Docker multi-stage build, and Trivy scan flags are technically valid after the fixes above. The layer caching example uses Docker's `--cache-from`; teams using BuildKit-heavy builds may want to evaluate inline cache or registry cache exporters in the future, but the example is still valid as a basic cache source pattern.

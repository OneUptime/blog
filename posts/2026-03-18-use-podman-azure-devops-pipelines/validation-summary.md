# Validation Summary: How to Use Podman in Azure DevOps Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Azure DevOps Pipelines
- Azure Container Registry (ACR)
- Azure CLI
- YAML pipeline configuration
- PostgreSQL container-based integration testing

## Sources Consulted
- Microsoft Learn: Azure Container Registry authentication options — https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Microsoft Learn: AzureCLI@2 task reference — https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2?view=azure-pipelines
- Microsoft Learn: Publish and download pipeline artifacts — https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/pipeline-artifacts?view=azure-devops
- Microsoft Learn: Microsoft-hosted agents for Azure Pipelines — https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/hosted?view=azure-devops
- Podman docs: `podman build` — https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman docs: `podman login` — https://docs.podman.io/en/v4.7.2/markdown/podman-login.1.html
- Podman docs: `podman push` — https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman docs: `podman load` — https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Podman docs: `podman run` — https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman docs: `podman exec` — https://docs.podman.io/en/stable/markdown/podman-exec.1.html
- Podman docs: `podman pod create` — https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman docs: `podman pod rm` — https://docs.podman.io/en/v5.4.0/markdown/podman-pod-rm.1.html

## Issues Found

1. **The multi-stage pipeline example was missing required variables.** The snippet referenced `acrName`, `acrLoginServer`, `imageName`, and `imageTag` without defining them, so it would not run as written. Added the shared `variables` block to make the example self-consistent.

2. **The integration-test database readiness check was flaky.** The example used a fixed `sleep 5` followed by a single `pg_isready` call, which can fail on normal slow starts. Replaced it with a retry loop using `podman exec testdb pg_isready -U postgres` so the example waits until PostgreSQL is actually ready.

## Review Notes
- The ACR login flow shown in the post is valid for Podman. Microsoft documents both the `az acr login --expose-token` token flow used here and an alternative approach using `DOCKER_COMMAND=podman az acr login`.
- Microsoft-hosted Azure Pipelines agents are ephemeral per job, so reinstalling Podman in each job and moving the image between stages with pipeline artifacts is technically appropriate.
- The Microsoft Entra token obtained through `az acr login` is time-limited; Microsoft documents a three-hour validity window for this authentication flow.

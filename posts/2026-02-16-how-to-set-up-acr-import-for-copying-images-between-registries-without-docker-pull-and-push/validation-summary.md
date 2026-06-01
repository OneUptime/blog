# Validation Summary: How to Set Up ACR Import for Copying Images Between Registries Without Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Registry
- Azure CLI
- ACR image import
- Docker Hub
- GitHub Container Registry
- Azure DevOps Pipelines
- GitHub Actions
- Bash

## Sources Consulted
- Microsoft Learn: Azure CLI `az acr import` reference: https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest#az-acr-import
- Microsoft Learn: Import container images to Azure Container Registry: https://learn.microsoft.com/en-ca/azure/container-registry/container-registry-import-images
- Microsoft Learn: Azure CLI `az acr manifest` reference: https://learn.microsoft.com/en-us/cli/azure/acr/manifest?view=azure-cli-latest
- Microsoft Learn: Manage public content with Azure Container Registry: https://learn.microsoft.com/en-us/azure/container-registry/buffer-gate-public-content
- Docker Docs: Docker Hub pull usage and limits: https://docs.docker.com/docker-hub/usage/pulls/
- Microsoft Learn: Authenticate to Azure from GitHub Actions by a secret: https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-secret

## Issues Found
- The post said ACR import works with any OCI-compliant registry. Microsoft documents that source registries must support RFC 7233 HTTP range requests when using registry URI import, so the wording was narrowed to many OCI-compatible registries that support HTTP range requests.
- The ACR-to-ACR examples used fully qualified source image references while relying on Azure authentication. Current Azure CLI documentation requires `--registry` to use integrated Microsoft Entra authentication, and when `--registry` is supplied, `--source` should be only the source repository and tag. The same-subscription, cross-subscription, basic ACR, and Azure Pipelines examples were corrected.
- The cross-subscription example described the source permission as Reader. The post now avoids that inaccurate shorthand and explains that the caller needs import permissions on the target and read/pull permissions on the source.
- The bulk import script suggested rerunning `az acr import` without `--no-wait` to check status. Azure CLI documentation recommends confirming queued imports with repository inspection, so the message now points to `az acr repository show-tags`.
- The digest lookup example used `az acr manifest show --query digest`, but the Azure CLI metadata command is the appropriate command for retrieving the digest field by tag. The example now uses `az acr manifest show-metadata`.
- The Docker Hub rate-limit wording implied all authenticated pulls are limited to 200 per 6 hours and that ACR has no rate limits. Docker's current documentation says Docker Personal authenticated pulls are limited to 200 per 6 hours, while paid plans have unlimited pull rate subject to fair use. The wording was corrected to focus on avoiding Docker Hub pull rate limits.
- The troubleshooting section claimed there is no way to increase a timeout for large imports. The guidance was narrowed to the documented behavior of using `--no-wait` and checking repository tags afterward.
- The GitHub Actions workflow used `azure/login@v1`. Microsoft Learn examples now use `azure/login@v2`, so the action version was updated.

## Review Notes
The Azure CLI was not installed in the local environment, so command verification was performed against current official Microsoft Learn and Docker documentation.

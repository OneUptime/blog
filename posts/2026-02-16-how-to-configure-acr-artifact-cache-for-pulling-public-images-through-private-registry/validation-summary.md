# Validation Summary: Configure ACR Artifact Cache for Pulling Public Images Through Private Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Registry
- ACR Artifact Cache
- Azure CLI
- Azure Key Vault
- Docker Hub
- GitHub Container Registry
- Quay.io
- Kubernetes / AKS
- Kustomize
- Microsoft Defender for Containers

## Sources Consulted
- Azure Container Registry artifact cache overview: https://learn.microsoft.com/en-us/azure/container-registry/artifact-cache-overview
- Enable artifact cache with Azure CLI: https://learn.microsoft.com/en-us/azure/container-registry/artifact-cache-cli
- Azure CLI `az acr cache` reference: https://learn.microsoft.com/en-us/cli/azure/acr/cache?view=azure-cli-latest
- Azure CLI `az acr credential-set` reference: https://learn.microsoft.com/en-us/cli/azure/acr/credential-set?view=azure-cli-lts
- ACR artifact cache wildcard support: https://learn.microsoft.com/en-us/azure/container-registry/wildcards-artifact-cache
- Docker Hub pull usage and limits: https://docs.docker.com/docker-hub/usage/storage/
- Azure CLI `az acr repository` reference: https://learn.microsoft.com/en-us/cli/azure/acr/repository?view=azure-cli-lts
- Microsoft Defender for Cloud container image vulnerability assessment: https://learn.microsoft.com/en-gb/azure/defender-for-cloud/agentless-vulnerability-assessment-azure
- Defender for Containers gated deployment: https://learn.microsoft.com/en-us/azure/defender-for-cloud/gated-deployment-introduction

## Issues Found
- Docker Hub cache rules were shown without credentials, but current ACR documentation states Docker Hub supports authenticated pulls only and requires a credential set. Added credential-set creation, Key Vault secret access, and `--cred-set docker-hub-creds` to Docker Hub cache-rule commands.
- The prerequisites listed Azure CLI 2.45 or later, while the official ACR artifact cache CLI guide requires Azure CLI 2.46.0 or later. Updated the prerequisite.
- The Docker Hub rate-limit statement incorrectly described "free accounts" as 100 pulls per 6 hours. Updated it to distinguish unauthenticated users at 100 pulls per 6 hours and Personal authenticated users at 200 pulls per 6 hours.
- The post said ACR periodically refreshes cached images based on configuration and refreshes cached tags when upstream digests change. Current ACR docs state artifact cache does not automatically pull newly available tags. Reworded the cache refresh and staleness guidance.
- The security scanning section used `az acr repository show --query "changeableAttributes"` as a scan-results command. That command returns repository or image attributes, not vulnerability findings. Replaced it with guidance to review Microsoft Defender for Cloud recommendations and use Defender for Containers gated deployment for blocking vulnerable deployments.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI verification was performed against official Microsoft Learn command references rather than local `--help` output.

# Validation Summary: How to Use Azure Container Registry with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Registry
- Azure CLI
- Podman
- containers-registries.conf
- Microsoft Entra service principals
- Microsoft Defender for Cloud vulnerability assessment
- Azure Container Registry geo-replication

## Sources Consulted
- Microsoft Learn: Azure Container Registry authentication options, including `az acr login --expose-token`: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Microsoft Learn: Azure Container Registry service principal authentication: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal
- Microsoft Learn: Azure CLI `az acr` command reference: https://learn.microsoft.com/en-us/cli/azure/acr
- Microsoft Learn: Azure CLI `az acr repository` command reference: https://learn.microsoft.com/en-us/cli/azure/acr/repository
- Microsoft Learn: Azure Container Registry geo-replication: https://learn.microsoft.com/en-gb/azure/container-registry/container-registry-geo-replication
- Microsoft Learn: Microsoft Defender for Cloud vulnerability assessments for containers: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-vulnerability-assessment-azure
- Podman documentation: `podman login`: https://docs.podman.io/en/v4.7.2/markdown/podman-login.1.html
- containers-registries.conf manual: https://manpages.ubuntu.com/manpages/jammy/en/man5/containers-registries.conf.5.html

## Issues Found
- The post said ACR provides vulnerability scanning directly. Updated the wording to say ACR can integrate with Microsoft Defender for Cloud for vulnerability assessment, which matches current Microsoft documentation.
- The Azure CLI token authentication example included an extra `az acr login --expose-token` command that would print token output and was not needed for the Podman login flow. Removed the redundant command and kept the token capture/login sequence.
- The image management section labeled `az acr repository delete --image myapp:v1.0 --yes` as deleting an image tag. Microsoft documents this command as deleting the image manifest and potentially all tags that reference it. Replaced it with `az acr repository untag --image myapp:v1.0`, which matches the stated intent.
- The geo-replication section said Podman automatically connects to the nearest replica. Updated this to say Azure routes requests to an appropriate replica when using the registry FQDN, which matches ACR geo-replication behavior.

## Review Notes
The remaining Azure CLI, Podman login, service principal, push, pull, and `registries.conf` examples are syntactically consistent with the consulted documentation. The CI/CD script assumes the service principal environment variables are already populated by the pipeline secret system.

# Validation Summary: How to Pull Images from a Private Registry in Azure Container Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Instances
- Azure Container Registry
- Azure CLI
- Managed identities for Azure resources
- Microsoft Entra service principals
- Docker Hub
- GitHub Container Registry
- Self-hosted Docker registries
- Azure Resource Manager/YAML container group definitions

## Sources Consulted
- Azure Container Instances YAML reference: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-reference-yaml
- Azure CLI `az container create` reference: https://learn.microsoft.com/en-us/cli/azure/container
- Deploy to Azure Container Instances from Azure Container Registry using a managed identity: https://learn.microsoft.com/en-us/azure/container-instances/using-azure-container-registry-mi
- Deploy to Azure Container Instances from Azure Container Registry using a service principal: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-using-azure-container-registry
- Azure Container Instances image security guidance: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-image-security
- Azure Container Registry managed identity authentication: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication-managed-identity
- Azure Container Registry Docker Content Trust documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-content-trust
- Docker Hub personal access token documentation: https://docs.docker.com/security/for-developers/access-tokens/

## Issues Found
- The YAML examples used `memoryInGb`, but the Azure Container Instances YAML schema uses `memoryInGB`. Updated all YAML snippets to use the documented property name.
- The Docker Hub example used a password placeholder. Updated it to use an access token placeholder because Docker recommends personal access tokens for programmatic/CLI authentication, and they are required when 2FA is enabled.
- The self-hosted registry firewall guidance said to allow Azure IP ranges. Updated it to refer to the actual public IP addresses used by the container instance, such as a NAT gateway public IP for ACI in a virtual network.
- The Docker Hub rate-limit note said ACR has no pull rate limits within Azure. Updated the wording to avoid implying ACR has no service limits and to state the precise benefit: avoiding Docker Hub pull rate limits.
- The vulnerability scanning bullet described scanning as built into ACR. Updated it to state that ACR can integrate with Microsoft Defender for Cloud for image scanning.
- The content trust recommendation did not mention Docker Content Trust deprecation. Updated it to recommend current image signing and verification tooling for new deployments.

## Review Notes
The Azure CLI examples and managed identity fields align with current Microsoft documentation. The post uses API version `2021-09-01`, which remains listed as supported, though Microsoft’s current YAML reference uses `2021-10-01` as the latest documented version.

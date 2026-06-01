# Validation Summary: How to Set Up ACR Token-Based Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Registry
- ACR tokens and scope maps
- Azure CLI
- Docker authentication
- Kubernetes imagePullSecrets
- Azure Monitor diagnostic settings
- Log Analytics and KQL

## Sources Consulted
- Microsoft Learn: Non-Microsoft Entra token-based repository permissions in Azure Container Registry: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-token-based-repository-permissions
- Microsoft Learn: az acr scope-map CLI reference: https://learn.microsoft.com/en-us/cli/azure/acr/scope-map
- Microsoft Learn: az acr token CLI reference: https://learn.microsoft.com/en-us/cli/azure/acr/token
- Microsoft Learn: az acr token credential CLI reference: https://learn.microsoft.com/en-us/cli/azure/acr/token/credential
- Microsoft Learn: az monitor diagnostic-settings CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: az monitor log-analytics CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics
- Microsoft Learn: ContainerRegistryLoginEvents table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerregistryloginevents
- Microsoft Learn: Supported log categories for Microsoft.ContainerRegistry/registries: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-containerregistry-registries-logs

## Issues Found
- The prerequisites incorrectly stated that token-based authentication requires the Premium SKU. Microsoft documentation states the feature is available in all Azure Container Registry service tiers, so the SKU requirement was removed.
- The Azure CLI prerequisite was stricter than the official documented requirement. Changed Azure CLI 2.50 or later to 2.17.0 or later.
- Several examples used `myRegistry` as the registry name. Azure CLI documentation specifies registry names should be lower case, so the examples now consistently use `myregistry`.
- Token creation examples implied passwords would be generated later, but `az acr token create` generates passwords by default. Added `--no-passwords` to keep the later password-generation step accurate.
- Password generation examples used the invalid `--expiry` option. Replaced it with the supported `--expiration` option.
- The partner token example used an expiration timestamp of `2026-06-01T00:00:00Z`, which is already expired on the validation date. Changed it to `2026-12-01T00:00:00Z`.
- The diagnostic settings example queried the resource-specific `ContainerRegistryLoginEvents` table but did not enable resource-specific export. Added `--export-to-resource-specific true`.
- Changed "displayed once at creation time" to "displayed once at generation time" for token passwords generated after token creation.

## Review Notes
The Docker, Kubernetes secret, scope map, token lifecycle, and KQL examples are consistent with current official documentation after the corrections above. The local environment did not have Azure CLI installed, so CLI validation was performed against official Microsoft Learn CLI references rather than local `az --help` output.

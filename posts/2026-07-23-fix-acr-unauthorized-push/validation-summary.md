# Validation Summary: Fixing “Unauthorized: Authentication Required” When Pushing to ACR

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Azure Container Registry (ACR)
- Azure CLI
- Docker and the Distribution Registry HTTP API V2
- Microsoft Entra ID authentication
- Azure RBAC and ABAC repository permissions
- ACR scope maps and registry-native tokens
- Azure Private Link, private DNS, firewall rules, and data endpoints

## Sources Consulted

- [Troubleshoot Azure Container Registry authentication issues](https://learn.microsoft.com/en-us/troubleshoot/azure/azure-container-registry/acr-authentication-errors)
- [Troubleshoot ACR login, authentication, and authorization](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-troubleshoot-login-authn-authz)
- [Troubleshoot push errors in Azure Container Registry](https://learn.microsoft.com/en-us/troubleshoot/azure/azure-container-registry/troubleshoot-push-error-operation-disallowed-timeout)
- [Microsoft Entra permissions and role assignments for ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Microsoft Entra ABAC repository permissions in ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Non-Microsoft Entra token-based repository permissions](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-token-based-repository-permissions)
- [Create an ACR registry with Azure CLI, including DNL behavior](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-get-started-azure-cli)
- [Azure Container Registry geo-replication and regional endpoints](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication)
- [Azure Container Registry endpoint reference](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-endpoint-reference)
- [Connect privately to ACR with Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
- [Configure firewall access rules for ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-firewall-rules)
- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Azure CLI `az acr` reference](https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest)
- [Azure CLI `az role assignment` reference](https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest)
- [Distribution Registry HTTP API V2 specification](https://distribution.github.io/distribution/spec/api/)

## Issues Found

- The post mentioned hostname-specific credentials for regional endpoints but used only the global-endpoint login flow. Added the documented Azure CLI 2.86.0 requirement and `az acr login --endpoint '<region>'` guidance, and identified regional endpoints as a preview feature.
- The role-assignment explanation stated too broadly that role-assignment commands require a service principal object ID. Narrowed it to the `--assignee-object-id` option; `--assignee` can resolve other supported identifiers.
- The network-access explanation listed only public IP rules and private endpoints. Added the preview virtual-network/service-endpoint path and eligible trusted-service bypasses as valid ACR network admission paths.
- The private-endpoint DNS check named only one constructed data endpoint. Changed it to verify the exact login server and every hostname returned by the registry's `dataEndpointHostNames` property, which also covers geo-replicated registries.
- The unauthenticated `/v2/` probe described HTTP 401 as the only expected reachable response. Clarified that HTTP 200 can be returned when anonymous pull is enabled and that either 200 or 401 demonstrates endpoint reachability.
- The write-lock section discussed repository and image locks but inspected and updated only repository-level attributes. Added image-by-tag and image-by-digest inspection guidance and clarified that the matching `--image` target must be updated for image-level locks.
- The error table referred only to repository or manifest locks. Changed it to repository or image locks so it accurately includes tag-level and manifest-level changeable attributes.

## Review Notes

All Bash snippets pass shell syntax validation. Command names and options were checked against the current official Azure CLI reference; the regional-endpoint flow requires Azure CLI 2.86.0 or later as stated in the corrected post. The documentation links and author link resolve successfully. No live registry operations were performed.

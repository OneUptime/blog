# Validation Summary: How to Use Dapr with Azure Key Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Azure Key Vault
- Azure CLI (`az` commands)
- Python (requests library)
- Kubernetes (AKS managed identity)
- Redis (as example dependent component)

## Sources Consulted
- Dapr Azure Key Vault secret store component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr component secrets documentation: https://docs.dapr.io/operations/components/component-secrets/
- Dapr component scopes documentation: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Azure authentication documentation: https://docs.dapr.io/developing-applications/integrations/azure/authenticating-azure/
- Azure CLI Key Vault documentation: https://learn.microsoft.com/en-us/cli/azure/keyvault

## Issues Found
- **Incorrect query parameter for secret versioning**: The blog used `metadata.version` as the query parameter to retrieve a specific secret version. The correct parameter per the Dapr Secrets API documentation is `metadata.version_id`. Fixed `params={"metadata.version": "abc123def456"}` to `params={"metadata.version_id": "abc123def456"}`.

## Review Notes
- The managed identity section notes that omitting `azureClientId` defaults to system-assigned managed identity, which is correct. However, the Dapr docs recommend still providing `azureClientId` even for system-assigned identities. This is a minor best-practice nuance, not an error.
- The `azureClientSecret` authentication method shown is valid but certificate-based auth or managed identity is preferred for production. The post does show the managed identity alternative, which is good.
- All Azure CLI commands, Dapr component YAML structures, API endpoints, field names, and scoping configuration are correct.

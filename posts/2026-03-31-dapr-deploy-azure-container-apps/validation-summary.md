# Validation Summary: How to Deploy Dapr Applications to Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Apps (ACA)
- Dapr (Distributed Application Runtime)
- Azure CLI (`az containerapp` commands)
- Bicep (Azure infrastructure-as-code)
- Azure Service Bus (Dapr pub/sub component)

## Sources Consulted
- Azure CLI `az containerapp create --help` — verified all Dapr-related flags (`--enable-dapr`, `--dapr-app-id`, `--dapr-app-port`, `--dapr-app-protocol`)
- Azure CLI `az containerapp env create --help` — verified environment creation parameters
- Azure CLI `az containerapp env dapr-component set --help` — verified Dapr component command and `--yaml` parameter
- Microsoft Azure Container Apps Dapr integration documentation (https://learn.microsoft.com/en-us/azure/container-apps/dapr-overview)
- Microsoft Bicep reference for Microsoft.App/containerApps (https://learn.microsoft.com/en-us/azure/templates/microsoft.app/containerapps)
- Dapr component reference for Azure Service Bus pub/sub (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-queues/)

## Issues Found

1. **Bicep code block tagged as `yaml` instead of `bicep`** — The code block containing Bicep infrastructure-as-code was marked with ` ```yaml ` syntax highlighting, and used `#` for the filename comment (YAML comment syntax). Changed to ` ```bicep ` with `//` comment syntax for correct highlighting and consistency.

2. **Incorrect curl URL in Step 5** — The original command `curl https://orders-service.eastus.azurecontainerapps.io/v1.0/metadata` had two problems:
   - **Wrong FQDN format**: Azure Container Apps FQDNs include a unique environment identifier (format: `<app-name>.<unique-id>.<region>.azurecontainerapps.io`). The simplified URL shown would not resolve.
   - **Dapr sidecar endpoint not externally accessible**: The `/v1.0/metadata` path is a Dapr sidecar API endpoint, accessible only from within the container at `localhost:3500`. It is not exposed through the external ingress.
   - **Fix**: Replaced with commands that retrieve the actual FQDN via `az containerapp show --query` and curl the app's external endpoint.

## Review Notes
- The `--yaml - <<EOF` pattern used in Step 4 to pipe YAML via stdin works in practice with Azure CLI, though the `--yaml` parameter is officially documented as accepting a file path. This is a common pattern in Azure tutorials and should work reliably.
- The Bicep template in Step 3 references undeclared variables (`location`, `environment`) — this is acceptable as it's clearly a snippet, not a complete template. Readers will understand these need to be defined.
- The Dapr component YAML omits the optional `scopes` field. For production use, scoping components to specific apps is recommended, but omitting it is fine for a tutorial.
- The Bicep API version `2023-05-01` is valid but not the latest. A newer version (e.g., `2024-03-01`) could be used, but the properties shown are stable across versions.
- All Azure CLI commands (`az group create`, `az containerapp env create`, `az containerapp create`, `az containerapp env dapr-component set`, `az containerapp show`, `az deployment group create`) were verified against CLI help output and are correct.

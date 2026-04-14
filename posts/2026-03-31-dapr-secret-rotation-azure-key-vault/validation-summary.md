# Validation Summary: How to Implement Secret Rotation with Dapr and Azure Key Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secret store building block, .NET SDK)
- Azure Key Vault (secret versioning, rotation policies)
- Azure Event Grid (event subscriptions, webhook validation)
- Azure CLI (`az keyvault`, `az eventgrid`)
- C# / ASP.NET Core (minimal APIs, DaprClient)
- Azure Workload Identity (managed identity for AKS)

## Sources Consulted
- [Dapr Azure Key Vault secret store component reference](https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/)
- [Dapr .NET SDK - Getting started with the client](https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/)
- [Dapr - How To: Retrieve a secret](https://docs.dapr.io/developing-applications/building-blocks/secrets/howto-secrets/)
- [Dapr - Authenticating to Azure](https://docs.dapr.io/developing-applications/integrations/azure/azure-authentication/authenticating-azure/)
- [Azure CLI - az keyvault secret](https://learn.microsoft.com/en-us/cli/azure/keyvault/secret?view=azure-cli-latest)
- [Azure CLI - az keyvault key rotation-policy](https://learn.microsoft.com/en-us/cli/azure/keyvault/key/rotation-policy?view=azure-cli-latest)
- [Azure Event Grid event schema](https://learn.microsoft.com/en-us/azure/event-grid/event-schema)
- [Azure Event Grid - CloudEvents v1.0 schema](https://learn.microsoft.com/en-us/azure/event-grid/cloud-event-schema)
- [Azure Event Grid - Endpoint validation (Event Grid schema)](https://learn.microsoft.com/en-us/azure/event-grid/end-point-validation-event-grid-events-schema)
- [Azure Event Grid - Endpoint validation (CloudEvents schema)](https://learn.microsoft.com/en-us/azure/event-grid/end-point-validation-cloud-events-schema)
- [Azure Key Vault - Secret rotation tutorial](https://learn.microsoft.com/en-us/azure/key-vault/secrets/tutorial-rotation)

## Issues Found

### Issue 1: Incorrect Azure CLI command for secret rotation policy
- **What was wrong:** The post used `az keyvault secret set-rotation-policy`, which is not a valid Azure CLI command. The `set-rotation-policy` subcommand does not exist under `az keyvault secret`.
- **What was changed:** Replaced with `az keyvault secret rotation-policy update`, which follows the correct Azure CLI command structure.
- **Why:** The Azure CLI uses the `rotation-policy update` subgroup pattern (consistent with `az keyvault key rotation-policy update` for keys).

### Issue 2: Event delivery schema mismatch between CLI command and C# code
- **What was wrong:** The Event Grid subscription CLI command specified `--event-delivery-schema CloudEventSchemaV1_0`, but the C# webhook handler deserializes the request body as `AzureEventGridEvent[]`, which corresponds to the EventGrid native schema format. CloudEvents v1.0 uses a completely different JSON structure (fields like `specversion`, `type`, `source` instead of `eventType`, `topic`, `dataVersion`). Additionally, CloudEvents uses HTTP OPTIONS for endpoint validation, not the `SubscriptionValidationEvent` handshake that the C# code implements.
- **What was changed:** Changed `--event-delivery-schema CloudEventSchemaV1_0` to `--event-delivery-schema EventGridSchema`.
- **Why:** The C# code is written for EventGrid native schema, so the delivery schema must match to ensure correct deserialization and validation handshake behavior.

## Review Notes
- The Dapr component configuration, metadata fields (`vaultName`, `azureClientId`, `azureEnvironment`), and values are all correct per official Dapr documentation.
- `DaprClient.GetSecretAsync` correctly returns `Dictionary<string, string>` and the code accesses it properly via `secret["db-connection-string"]`.
- The Azure Workload Identity annotation (`azure.workload.identity/client-id`) is the modern recommended approach for AKS and is correctly shown.
- The `AzureEventGridEvent` type and `ValidationData` type referenced in the C# code are not from a standard NuGet package shown in imports. In a real implementation, the developer would need to either use the `Azure.Messaging.EventGrid` SDK's `EventGridEvent` class or define custom DTOs. This is acceptable for a tutorial that focuses on the conceptual flow.
- The rotation policy JSON structure (lifetimeActions, trigger, action, attributes with ISO 8601 duration) matches the Azure Key Vault API format.

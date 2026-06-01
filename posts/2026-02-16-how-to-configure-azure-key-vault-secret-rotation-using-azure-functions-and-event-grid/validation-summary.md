# Validation Summary: How to Configure Azure Key Vault Secret Rotation Using Azure Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Key Vault
- Azure Event Grid
- Azure Functions
- PowerShell
- Azure PowerShell Az modules
- Azure Storage account keys
- Azure Monitor and Log Analytics

## Sources Consulted
- Azure Key Vault as Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-key-vault
- Monitoring Key Vault with Azure Event Grid: https://learn.microsoft.com/en-us/azure/key-vault/general/event-grid-overview
- Azure Event Grid trigger for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid-trigger
- PowerShell developer reference for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-powershell
- New-AzFunctionApp PowerShell reference: https://learn.microsoft.com/en-us/powershell/module/az.functions/new-azfunctionapp
- Update-AzFunctionApp PowerShell reference: https://learn.microsoft.com/en-us/powershell/module/az.functions/update-azfunctionapp
- Set-AzKeyVaultSecret PowerShell reference: https://learn.microsoft.com/en-us/powershell/module/az.keyvault/set-azkeyvaultsecret
- New-AzStorageAccountKey PowerShell reference: https://learn.microsoft.com/en-us/powershell/module/az.storage/new-azstorageaccountkey
- Get-AzStorageAccountKey PowerShell reference: https://learn.microsoft.com/en-us/powershell/module/az.storage/get-azstorageaccountkey
- New-AzEventGridSubscription PowerShell reference: https://learn.microsoft.com/en-us/powershell/module/az.eventgrid/new-azeventgridsubscription
- New-AzEventGridAzureFunctionEventSubscriptionDestinationObject PowerShell reference: https://learn.microsoft.com/en-us/powershell/module/az.eventgrid/new-azeventgridazurefunctioneventsubscriptiondestinationobject
- Monitor Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/monitor-functions
- Monitor Azure Functions with Log Analytics: https://learn.microsoft.com/en-us/azure/azure-functions/functions-monitor-log-analytics
- Application Insights metrics overview: https://learn.microsoft.com/en-us/azure/azure-monitor/app/metrics-overview

## Issues Found
- The introduction described Azure Key Vault as supporting automatic secret rotation. Azure Key Vault emits Event Grid events for secret status changes, but the rotation behavior for secrets is implemented by the automation workflow. Changed this to "event-driven secret rotation."
- The first secret setup step said the command created a near-expiry notification. `Set-AzKeyVaultSecret` sets the secret and its expiration, while the Key Vault Event Grid event is raised by the service 30 days before expiration. Updated the wording.
- The initial secret tags did not include `CurrentKeyName`, even though the rotation function depends on that tag to alternate between `key1` and `key2`. Added `CurrentKeyName = "key1"` and made the function fail explicitly when the tag is not `key1` or `key2`.
- The function code used Event Grid top-level fields for the secret and vault names. Azure Key Vault event data includes `data.ObjectName` and `data.VaultName`, so the function now reads those fields directly.
- The function code used Az cmdlets without authenticating in the Function App runtime. Added `Connect-AzAccount -Identity` so the code uses the system-assigned managed identity.
- The Event Grid subscription example used older parameter names such as `EventSubscriptionName`, `ResourceId`, `EndpointType`, and `Endpoint`. Updated it to the current `Az.EventGrid` pattern using `New-AzEventGridAzureFunctionEventSubscriptionDestinationObject`, `-Name`, `-Scope`, `-Destination`, and filter parameters.
- The near-expiry timing section said secret near-expiry timing can be customized through Key Vault event settings or secret notification triggers. Microsoft documentation states `Microsoft.KeyVault.SecretNearExpiry` is raised 30 days before expiration; configurable timing is documented for key rotation policy events. Updated the section accordingly.
- The monitoring example used `FunctionExecutionCount > 0` as a failure alert. That metric counts executions and does not indicate failures. Replaced the PowerShell metric-alert snippet with a Log Analytics query for exceptions from the `RotateSecret` function.

## Review Notes
- The tutorial remains a high-level deployment guide. A production implementation should also include the PowerShell Function App project files, such as `requirements.psd1` for Az module dependencies and `profile.ps1` if module imports or startup authentication are centralized.

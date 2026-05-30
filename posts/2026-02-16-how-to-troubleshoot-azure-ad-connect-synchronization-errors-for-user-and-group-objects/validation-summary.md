# Validation Summary: How to Troubleshoot Azure AD Connect Synchronization Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Microsoft Entra Connect Sync / Azure AD Connect
- Microsoft Entra ID
- Active Directory Domain Services
- ADSync PowerShell module
- Microsoft Graph PowerShell SDK
- Microsoft Entra Connect Health

## Sources Consulted
- Microsoft Entra Connect: Troubleshoot errors during synchronization: https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/tshoot-connect-sync-errors
- Microsoft Entra Connect: ADSync PowerShell Reference: https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-adsync
- Microsoft Entra Connect Sync scheduler: https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-sync-feature-scheduler
- Troubleshoot an object that is not synchronizing with Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/tshoot-connect-object-not-syncing
- Microsoft Graph PowerShell query parameters: https://learn.microsoft.com/en-us/powershell/microsoftgraph/use-query-parameters
- Microsoft Graph advanced query capabilities on Microsoft Entra ID objects: https://learn.microsoft.com/en-us/graph/aad-advanced-queries
- Microsoft Graph PowerShell Update-MgUser reference: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.users/update-mguser
- Microsoft Entra ID service limits and restrictions: https://learn.microsoft.com/en-us/entra/identity/users/directory-service-limits-restrictions
- Troubleshoot data freshness alerts in Microsoft Entra Connect Health: https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/ad-dmn-services/aad-connect-health-data-freshness

## Issues Found
- `Get-ADSyncRunProfileResult -ConnectorName` used an unsupported parameter. Changed the example to retrieve the connector with `Get-ADSyncConnector -Name` and pass its identifier to `Get-ADSyncRunProfileResult -ConnectorId`.
- The LargeObject section stated that users have around 100 proxy addresses and groups have up to 50,000 members. Microsoft documents LargeObject as whole-object size/count behavior, a 15-value `userCertificate` limit, an approximate proxy address capacity that depends on object size, and a 250,000-member Microsoft Entra Connect v2 group sync limit. Updated the limits and remediation guidance.
- The validation error name was listed as `DataValidationFailed`. Microsoft documents this Entra Connect export error as `IdentityDataValidationFailed`, so the heading and symptom text were corrected.
- The group diagnostics example used `Get-ADSyncConnectorStatistics`, which is not part of the documented ADSync module reference. Replaced it with `Get-ADSyncRunProfileResult -RunStepDetails` for recent run details.
- The Connect Health service check used `Get-Service -Name` with a display name. Changed it to `Get-Service -DisplayName "Microsoft Entra Connect Health Sync Insights Service"`.

## Review Notes
The post is technically relevant and remains useful. Some terminology still uses "Azure AD Connect" because that is common in existing installations and paths, but Microsoft documentation now generally uses Microsoft Entra Connect Sync / Microsoft Entra ID naming.

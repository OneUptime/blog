# Validation Summary: How to Use Azure Log Analytics to Query Azure Active Directory Sign-In Logs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Entra ID sign-in logs
- Azure Monitor diagnostic settings
- Log Analytics workspace
- Kusto Query Language (KQL)
- Azure CLI
- Azure Workbooks and log alerts

## Sources Consulted
- Microsoft Learn: Configure Microsoft Entra diagnostic settings for activity logs - https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-configure-diagnostic-settings
- Microsoft Learn: What are the identity logs you can stream to an endpoint? - https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-diagnostic-settings-logs-options
- Microsoft Learn: Microsoft Entra data retention - https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention
- Microsoft Learn: Azure CLI az monitor diagnostic-settings - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: Azure Monitor Logs reference for SigninLogs - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs
- Microsoft Learn: Azure Monitor sample queries for AADServicePrincipalSignInLogs - https://learn.microsoft.com/azure/azure-monitor/reference/queries/aadserviceprincipalsigninlogs
- Microsoft Learn: Azure Monitor sample queries for AADManagedIdentitySignInLogs - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/aadmanagedidentitysigninlogs
- Microsoft Learn: microsoft.aadiam/diagnosticSettings ARM/Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.aadiam/diagnosticsettings

## Issues Found
- The Azure CLI diagnostic settings command used `/providers/Microsoft.AAD/domainServices`, which targets Azure AD Domain Services rather than Microsoft Entra tenant diagnostic settings. Changed it to `/providers/microsoft.aadiam`.
- The portal instructions referred to Azure Active Directory. Updated the navigation label to Microsoft Entra ID to match the current admin experience.
- The post stated that built-in views only go back 30 days. Microsoft Entra activity log retention is 7 days for Free and 30 days for P1/P2, so the statement was changed to license-aware wording.
- The post stated that data starts flowing in 15-30 minutes. Microsoft documentation says it might take up to three days for logs to appear in the destination, so the timing claim was corrected.

## Review Notes
The KQL examples use documented table names and columns such as `SigninLogs`, `AADNonInteractiveUserSignInLogs`, `AADServicePrincipalSignInLogs`, `AADManagedIdentitySignInLogs`, `ResultType`, `IPAddress`, `LocationDetails`, `AuthenticationRequirement`, and `ConditionalAccessPolicies`. The detection queries are reasonable starter examples, but production alerts should tune thresholds and exclusions for the tenant's normal sign-in patterns.

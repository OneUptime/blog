# Validation Summary: How to Set Up Conditional Access Policies in Microsoft Entra ID to Block Legacy

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Microsoft Entra ID
- Conditional Access
- Legacy authentication
- Microsoft Entra sign-in logs
- Azure Monitor Log Analytics / KQL
- Microsoft Graph PowerShell
- Exchange Online PowerShell
- Exchange Online authentication policies, POP3, IMAP4, and SMTP AUTH
- Security Defaults

## Sources Consulted
- Microsoft Learn: Block legacy authentication with Conditional Access - https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-block-legacy-authentication
- Microsoft Learn: Customize and filter activity logs in Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-customize-filter-logs
- Microsoft Learn: Conditional Access insights and reporting - https://learn.microsoft.com/en-us/entra/identity/conditional-access/howto-conditional-access-insights-reporting
- Microsoft Learn: Create conditionalAccessPolicy - Microsoft Graph v1.0 - https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-post-policies
- Microsoft Learn: conditionalAccessPolicy resource type - https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccesspolicy
- Microsoft Learn: New-MgIdentityConditionalAccessPolicy / Update-MgIdentityConditionalAccessPolicy reference - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/update-mgidentityconditionalaccesspolicy
- Microsoft Learn: Disable Basic authentication in Exchange Online - https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/disable-basic-authentication-in-exchange-online
- Microsoft Learn: Enable or disable authenticated client SMTP submission in Exchange Online - https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/authenticated-client-smtp-submission
- Microsoft Learn: POP3 and IMAP4 in Exchange Online - https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/pop3-and-imap4/pop3-and-imap4
- Microsoft Learn: Enable or disable modern authentication for Outlook in Exchange Online - https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/enable-or-disable-modern-authentication-in-exchange-online
- Microsoft Learn: Security defaults in Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/fundamentals/security-defaults
- Microsoft Learn: Troubleshoot sign-in problems with Conditional Access - https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access

## Issues Found
- The post said legacy clients often transmit credentials in plaintext or use weak encryption. This was changed to describe password-based basic authentication flows that cannot satisfy modern interactive security challenges, which better matches Microsoft guidance for Exchange Online and Entra ID.
- The prerequisites listed only Global Administrator or Security Administrator. Added Conditional Access Administrator, which is the role Microsoft documents for creating and managing Conditional Access policies.
- The KQL query used a case-sensitive `in` comparison and the value `MAPI Over HTTP`. Changed it to `in~` and `MAPI over HTTP` to match documented sign-in log labels more reliably, and removed the undocumented `SMTP` value while keeping `Authenticated SMTP`.
- The Conditional Access insights workbook step did not mention the Log Analytics requirement. Added that the workbook applies when a Log Analytics workspace is retaining sign-in logs.
- The migration guidance said PowerShell scripts should be updated to the Microsoft Graph PowerShell SDK. Adjusted this to mention Exchange Online PowerShell modern authentication or Graph PowerShell depending on the workload, matching the examples and Microsoft guidance.
- The Microsoft Graph PowerShell Conditional Access example used PascalCase request body keys. Changed the hashtable keys to the lower camelCase names used in Microsoft Graph PowerShell examples and the Graph schema.
- The Exchange Online best-practice note implied POP3, IMAP, and SMTP Basic authentication could all be disabled at the organization level in the Exchange admin center. Updated it to distinguish Exchange Online authentication policies, organization-level SMTP AUTH settings, and mailbox-level POP3/IMAP4 access controls.

## Review Notes
The post is technically relevant and accurate after the edits. Conditional Access report-only monitoring and the insights workbook depend on sign-in log availability and Log Analytics retention, so readers should confirm those prerequisites in their tenant.

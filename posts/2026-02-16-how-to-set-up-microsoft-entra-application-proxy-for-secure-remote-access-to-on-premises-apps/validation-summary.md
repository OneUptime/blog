# Validation Summary: How to Set Up Microsoft Entra App Proxy for Secure Remote Access to On-Premises

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Microsoft Entra Application Proxy
- Microsoft Entra private network connector
- Microsoft Graph PowerShell
- Microsoft Graph beta application APIs
- Kerberos Constrained Delegation
- Conditional Access
- Custom domains and TLS certificates
- Windows PowerShell and Active Directory PowerShell

## Sources Consulted
- Microsoft Learn: Publish on-premises apps with Microsoft Entra application proxy - https://learn.microsoft.com/en-us/entra/identity/app-proxy/overview-what-is-app-proxy
- Microsoft Learn: Configure connectors for Microsoft Entra Private Access and application proxy - https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-connectors
- Microsoft Learn: Configure application proxy using Microsoft Graph APIs - https://learn.microsoft.com/en-us/graph/application-proxy-configure-api
- Microsoft Learn: onPremisesPublishing resource type - https://learn.microsoft.com/en-us/graph/api/resources/onpremisespublishing
- Microsoft Learn: New-MgBetaOnPremisePublishingProfileConnectorGroup - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.beta.applications/new-mgbetaonpremisepublishingprofileconnectorgroup
- Microsoft Learn: Kerberos Constrained Delegation for SSO with application proxy - https://learn.microsoft.com/en-us/entra/identity/app-proxy/how-to-configure-sso-with-kcd
- Microsoft Learn: Configure custom domains with Microsoft Entra application proxy - https://learn.microsoft.com/en-us/entra/identity/app-proxy/how-to-configure-custom-domain
- Microsoft Learn: Troubleshoot application proxy issues and errors - https://learn.microsoft.com/en-us/entra/identity/app-proxy/application-proxy-troubleshoot
- Microsoft Learn: Redirect hard-coded links for apps published with application proxy - https://learn.microsoft.com/en-us/entra/identity/app-proxy/application-proxy-configure-hard-coded-link-translation

## Issues Found
- The connector endpoint requirements implied that `*.msappproxy.net` and `*.servicebus.windows.net` require both ports 443 and 80. Microsoft documents those service endpoints on 443, with port 80 used for certificate revocation and related endpoints. Updated the prerequisite and security wording.
- The connectivity test used an undocumented `adoncs.msappproxy.net/ssp/health` URL. Replaced it with port checks against documented Application Proxy service endpoints.
- The connector group PowerShell example used the non-beta cmdlet name and direct parameters. Microsoft documents this as a beta Graph API surface, so the example now imports `Microsoft.Graph.Beta.Applications` and calls `New-MgBetaOnPremisePublishingProfileConnectorGroup` with a body parameter.
- The Microsoft Graph publishing example created a `$proxySettings` hash table but never applied it, and it configured Application Proxy settings against the wrong object. Updated the example to configure the required application URIs first, then use the Microsoft Graph beta application API and `Update-MgBetaApplication` with the `onPremisesPublishing` property.
- The resource-based Kerberos Constrained Delegation command set `PrincipalsAllowedToDelegateToAccount` on the connector computer account. Microsoft documents this property on the target web application's service account for cross-domain/resource-based KCD. Updated the example accordingly.
- The troubleshooting event log command used the old `Microsoft AAD Application Proxy Connector` source. Updated it to the current `Microsoft Entra private network connector` source.
- The authentication-loop guidance pointed only to "Translate URLs in headers." Updated it to prefer matching internal and external URLs with custom domains and to review URL translation and cookie settings.

## Review Notes
The post is technically relevant and remains a valid Application Proxy setup guide after the corrections. The Microsoft Graph Application Proxy APIs are still under the beta namespace, so production automation should account for beta API change risk.

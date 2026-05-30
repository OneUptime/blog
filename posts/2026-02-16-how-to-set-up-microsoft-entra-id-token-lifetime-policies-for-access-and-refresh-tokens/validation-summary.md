# Validation Summary: How to Set Up Microsoft Entra ID Token Lifetime Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Entra ID
- Microsoft identity platform token lifetime policies
- Microsoft Graph API
- Microsoft Graph PowerShell SDK
- OAuth 2.0 / OpenID Connect tokens
- Conditional Access session controls
- PowerShell

## Sources Consulted
- Microsoft Learn: Configurable token lifetimes in the Microsoft identity platform, https://learn.microsoft.com/en-us/entra/identity-platform/configurable-token-lifetimes
- Microsoft Learn: Configure token lifetime policies, https://learn.microsoft.com/en-us/entra/identity-platform/configure-token-lifetimes
- Microsoft Learn: Refresh tokens in the Microsoft identity platform, https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens
- Microsoft Learn: Access tokens in the Microsoft identity platform, https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- Microsoft Learn: tokenLifetimePolicy resource type, https://learn.microsoft.com/en-us/graph/api/resources/tokenlifetimepolicy
- Microsoft Learn: Add tokenLifetimePolicy to servicePrincipal, https://learn.microsoft.com/en-us/graph/api/serviceprincipal-post-tokenlifetimepolicies
- Microsoft Learn: New-MgPolicyTokenLifetimePolicy, https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/new-mgpolicytokenlifetimepolicy
- Microsoft Learn: New-MgServicePrincipalTokenLifetimePolicyByRef, https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/new-mgserviceprincipaltokenlifetimepolicybyref
- Microsoft Learn: Remove-MgServicePrincipalTokenLifetimePolicyTokenLifetimePolicyByRef, https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/remove-mgserviceprincipaltokenlifetimepolicytokenlifetimepolicybyref
- Microsoft Learn: Configure adaptive session lifetime policies, https://learn.microsoft.com/en-us/entra/identity/conditional-access/howto-conditional-access-session-lifetime

## Issues Found
- The post described token lifetime policies as controlling refresh token lifetimes. Microsoft documentation states that token lifetime policies control access, ID, and SAML token lifetimes, and refresh/session token lifetime configuration was retired on January 30, 2021. I updated the description, introduction, caveat, and Conditional Access comparison.
- The refresh token explanation said non-SPA refresh tokens use a sliding 90-day window. Microsoft documentation says refresh tokens default to 24 hours for SPAs and email one-time passcode flows, and 90 days for other scenarios; refresh tokens replace themselves when used, and policy configuration cannot change those defaults. I corrected that wording.
- The stated maximum access token lifetime was "1 day". Microsoft documents the maximum as `23:59:59`, so I updated the caveat and parameter table.
- The Microsoft Graph connection example requested only `Policy.ReadWrite.ApplicationConfiguration`. Assigning a token lifetime policy to a service principal requires application write permission as well, and Microsoft's current example includes `Policy.ReadWrite.ApplicationConfiguration`, `Policy.Read.All`, and `Application.ReadWrite.All`. I updated the scope list.
- The service-to-service recommendation mentioned managed identities, but configurable token lifetimes are not supported for managed identity service principals. I narrowed the recommendation to confidential client applications that are not managed identities.
- The PowerShell JWT decoding helper used standard Base64 decoding directly on a JWT payload. JWT segments are Base64URL encoded, so tokens containing `-` or `_` could fail. I added Base64URL character normalization before padding and decoding.
- The cleanup example used `Remove-MgServicePrincipalTokenLifetimePolicyByRef`, but the current Microsoft Graph PowerShell cmdlet for removing a token lifetime policy reference from a service principal is `Remove-MgServicePrincipalTokenLifetimePolicyTokenLifetimePolicyByRef`. I corrected the command.

## Review Notes
The Graph PowerShell cmdlets and policy assignment examples match current Microsoft Graph documentation after the scope correction. The post still demonstrates manual JWT decoding only for validation/debugging; production clients should use token response metadata and supported Microsoft authentication libraries rather than parsing access tokens as application logic.

# Validation Summary: How to Troubleshoot Microsoft Entra ID SAML SSO Certificate Expiration

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Microsoft Entra ID
- SAML single sign-on
- X.509 SAML signing certificates
- Microsoft Graph PowerShell SDK
- Azure CLI
- Federation metadata XML

## Sources Consulted
- Microsoft Learn: Manage federation certificates in Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/tutorial-manage-certificates-for-federated-single-sign-on
- Microsoft Learn: Add-MgServicePrincipalTokenSigningCertificate - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/add-mgserviceprincipaltokensigningcertificate
- Microsoft Learn: Configure SAML-based single sign-on using Microsoft Graph - https://learn.microsoft.com/en-us/graph/application-saml-sso-configure-api
- Microsoft Learn: servicePrincipal resource type - https://learn.microsoft.com/en-us/graph/api/resources/serviceprincipal
- Microsoft Learn: Get-MgServicePrincipal - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/get-mgserviceprincipal
- Microsoft Learn: Microsoft Entra federation metadata - https://learn.microsoft.com/en-us/entra/identity-platform/federation-metadata
- Microsoft Learn: SAML-based single sign-on configuration and limitations - https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/migrate-adfs-saml-based-sso
- Microsoft Learn: Azure CLI account commands - https://learn.microsoft.com/en-us/cli/azure/account

## Issues Found
- The Graph PowerShell examples that read `KeyCredentials` did not explicitly request the `keyCredentials` property. Updated the `Get-MgServicePrincipal` calls to include `-Property "id,appId,displayName,keyCredentials"` or the equivalent property list.
- The first reporting script assigned the raw `CustomKeyIdentifier` byte array to `CertThumbprint`. Updated it to render the thumbprint as a hexadecimal string.
- The certificate creation example used a read-only Graph permission scope even though `Add-MgServicePrincipalTokenSigningCertificate` requires write permissions. Added `Connect-MgGraph -Scopes "Application.ReadWrite.All"` before the mutation example.
- The activation example set `preferredTokenSigningKeyThumbprint` to a key ID. Microsoft Graph expects the certificate thumbprint. Updated the sample to display a thumbprint derived from `CustomKeyIdentifier` and patch `preferredTokenSigningKeyThumbprint` through `-BodyParameter`.
- The post stated that federation metadata only includes the active certificate. Microsoft documentation says metadata can include multiple signing keys during certificate rollover. Updated the wording to explain that metadata-based rollover depends on the service provider supporting metadata refresh and multiple signing certificates.

## Review Notes
The notification timing, default three-year certificate lifetime, Entra admin center rollover flow, app-specific federation metadata URL pattern, SAML signing explanation, and Azure CLI tenant lookup command matched official documentation. The monitoring script is illustrative; production alerting still needs a concrete email or incident-routing implementation.

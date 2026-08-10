# Validation Summary: Choosing an Entra Credential: Secret, Certificate, or Managed Identity

## Status
validated

## Post Type
Technical comparison and credential-selection guide

## Technologies Covered
- Microsoft Entra ID application registrations and service principals
- OAuth 2.0 client credentials flow
- Client secrets
- X.509 certificate credentials and JWT client assertions
- Azure managed identities (system-assigned and user-assigned)
- Microsoft Entra workload identity federation and federated identity credentials
- OpenID Connect (OIDC)
- GitHub Actions OIDC federation
- Kubernetes service-account federation
- Azure RBAC and Microsoft Graph application permissions

## Sources Consulted
- Microsoft Learn: OAuth 2.0 client credentials flow on the Microsoft identity platform - https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow
- Microsoft Learn: Microsoft identity platform application authentication certificate credentials - https://learn.microsoft.com/en-us/entra/identity-platform/certificate-credentials
- Microsoft Learn: Security best practices for application properties - https://learn.microsoft.com/en-us/entra/identity-platform/security-best-practices-for-app-registration
- Microsoft Learn: Public client and confidential client applications - https://learn.microsoft.com/en-us/entra/identity-platform/msal-client-applications
- Microsoft Learn: Managed identities for Azure resources overview - https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview
- Microsoft Learn: Managed identity developer introduction and guidelines - https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview-for-developers
- Microsoft Learn: Managed identity best practice recommendations - https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/managed-identity-best-practice-recommendations
- Microsoft Learn: Workload identity federation concepts - https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation
- Microsoft Learn: Configure an app to trust an external identity provider - https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-create-trust
- Microsoft Learn: Configure a user-assigned managed identity to trust an external identity provider - https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-create-trust-user-assigned-managed-identity
- Microsoft Learn: Important considerations and restrictions for federated identity credentials - https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-considerations
- Microsoft Learn: Flexible federated identity credentials (preview) - https://learn.microsoft.com/en-us/entra/workload-id/workload-identities-flexible-federated-identity-credentials
- GitHub Docs: OpenID Connect reference, including immutable subject claims - https://docs.github.com/en/actions/reference/security/oidc

## Issues Found
- The GitHub Actions example showed only the name-based OIDC subject `repo:octo-org/orders:environment:Production`. GitHub.com repositories created after July 15, 2026 now use an immutable default subject containing owner and repository IDs; repositories renamed or transferred after that date also move to the immutable format. Added an immutable-subject example, retained and labeled the still-valid name-based example for older repositories, and clarified that the Entra federated credential must match the exact `sub` value GitHub emits. Also noted that GitHub Enterprise Server does not support immutable subjects.

## Review Notes
- The client-secret form body matches the Microsoft identity platform v2 client-credentials protocol, including the Microsoft Graph `/.default` scope and URL-encoding requirement. It is an illustrative form-body fragment rather than a complete HTTP request.
- The certificate explanation correctly describes proof of private-key possession, registered public certificate material, secure private-key storage, and overlapping credentials for rotation.
- The managed identity eligibility conditions, lifecycle descriptions, recommendation to prefer user-assigned identities for most scenarios, and `clientId`/`principalId` guidance match current Microsoft documentation.
- Baseline federated identity credentials still use exact issuer, subject, and audience matching. Microsoft currently documents a maximum of 20 credentials per application or user-assigned managed identity, supports RS256-signed issuer tokens, and documents flexible federated identity credentials as preview.
- Federated identity credentials can be configured on app registrations and user-assigned managed identities, but not directly on system-assigned managed identities. The post states this correctly.
- All URLs in the post's Official Documentation section resolved to the intended Microsoft Learn resources.

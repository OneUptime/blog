# Validation Summary: Entra ID B2B Guest vs Member: What Changes for Access, Claims, and Lifecycle?

## Status
validated

## Post Type
Technical reference and architecture guide

## Technologies Covered

- Microsoft Entra ID and Microsoft Entra External ID
- B2B collaboration Guest and Member users
- Microsoft Graph user, identity, and invitation properties
- Enterprise applications, app roles, dynamic groups, and Azure RBAC
- Microsoft identity platform ID-token and access-token claims
- Conditional Access and cross-tenant access settings
- Microsoft Entra ID Governance, access packages, and access reviews
- B2B direct connect and Microsoft Teams Connect shared channels

## Sources Consulted

- [Understand and manage the properties of B2B guest users](https://learn.microsoft.com/en-us/entra/external-id/user-properties)
- [Configure external collaboration settings for B2B](https://learn.microsoft.com/en-us/entra/external-id/external-collaboration-settings-configure)
- [Default user permissions in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/fundamentals/users-default-permissions)
- [Add and manage B2B collaboration users](https://learn.microsoft.com/en-us/entra/external-id/add-users-administrator)
- [Microsoft Graph user resource](https://learn.microsoft.com/en-us/graph/api/resources/user?view=graph-rest-1.0)
- [Microsoft Graph objectIdentity resource](https://learn.microsoft.com/en-us/graph/api/resources/objectidentity?view=graph-rest-1.0)
- [Microsoft Graph invitation resource](https://learn.microsoft.com/en-us/graph/api/resources/invitation?view=graph-rest-1.0)
- [Manage dynamic membership group rules](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership)
- [Restrict a Microsoft Entra app to a set of users](https://learn.microsoft.com/en-us/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users)
- [Access token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)
- [ID token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference)
- [Optional claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference)
- [Access tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [Secure applications and APIs by validating claims](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation)
- [Authentication and Conditional Access for External ID](https://learn.microsoft.com/en-us/entra/external-id/authentication-conditional-access)
- [Cross-tenant access overview](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview)
- [Cross-tenant synchronization overview](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-overview)
- [Govern access for external users in entitlement management](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-external-users)
- [Revoke user access in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/users/users-revoke-access)
- [B2B direct connect overview](https://learn.microsoft.com/en-us/entra/external-id/b2b-direct-connect-overview)
- [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519)
- [RFC 9068: JWT Profile for OAuth 2.0 Access Tokens](https://www.rfc-editor.org/rfc/rfc9068)

## Issues Found

- The post used “entitlement package,” but Microsoft calls the governed resource bundle an “access package”; entitlement management is the surrounding feature. Replaced both occurrences with the official term.
- The post said changing `userType` does not assign or revoke resource permissions, which was too absolute. Clarified that static assignments remain, but dynamic groups and product policies that evaluate `userType` can add or remove access after the classification changes.
- The guest-access settings were described as governing only directory visibility. Corrected this to default directory permissions and visibility because the most-inclusive setting grants guests the same default directory permissions as members.
- The description of `identities` could conflate the admin-center `ExternalAzureAD` label with raw Microsoft Graph data. Distinguished the portal label from Graph `objectIdentity` fields such as `signInType`, `issuer`, and `issuerAssignedId`.
- The token section implied that a literal `userType` claim was a normal optional claim. Clarified that it is not in the standard Entra claim set, that the documented optional Guest/Member classifier is `acct`, and that a literal user-type claim requires custom claims mapping.
- The token section tied claim differences generally to endpoint version. Clarified that ID-token version follows the endpoint, while access-token version and contents are controlled by the target resource. Also made the `tid` and pairwise `sub` descriptions more precise.
- The validation guidance did not clearly separate web-app, API, and client responsibilities. Clarified that a web app validates the ID token it consumes, a resource API validates access tokens whose `aud` identifies that API, and a client treats access tokens as opaque.
- The lifecycle wording could imply immediate loss of all access when either the home account or resource-tenant object is disabled or deleted. Clarified that new authentication or local sign-in stops, while already-issued access tokens and application sessions can remain effective until expiry or revocation.
- The B2B direct connect description suggested multiple current scenarios. Corrected it to its current Microsoft-documented scope, Microsoft Teams Connect shared channels, and stated explicitly that these users have no presence in the resource tenant.

## Review Notes

The post contains no code, commands, or configuration snippets, but it is a technical reference with concrete identity, token, authorization, and lifecycle implementation guidance, so it was fully reviewed and marked `validated`. The four Guest/Member and internal/external combinations, invitation object timing, `externalUserState` value, assignment behavior, Conditional Access applicability, cross-tenant MFA/device trust, external-Member use case, access-review guidance, and resource-tenant lifecycle ownership were confirmed. `externalUserState` is specifically invitation-flow metadata and can be null for users created by other paths; the post's “typically” qualifier is accurate. The author link and all five documentation links in the post resolve to their intended pages. No deprecated APIs, commands, or version-pinned examples are present.

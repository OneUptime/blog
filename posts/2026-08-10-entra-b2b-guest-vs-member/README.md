# Entra ID B2B Guest vs Member: What Changes for Access, Claims, and Lifecycle?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, External ID, B2B Collaboration, Guest User, Member User, Conditional Access, Identity Lifecycle

Description: Compare Entra B2B Guest and Member user types without confusing directory permissions, authentication source, token claims, application access, or lifecycle ownership.

---

A Microsoft Entra B2B collaboration user can be an external **Guest** or an external **Member**. The difference is important, but `userType` is not a complete authorization model and it does not say where the user authenticates.

Microsoft describes `userType` as the user's relationship to the resource tenant:

- `Guest` normally represents an external collaborator and receives restricted directory permissions by default.
- `Member` normally represents a worker or other person treated as internal and receives member-level directory permissions by default.

Authentication source is a separate property. An external Member can still authenticate in a partner tenant, and an internal account can be marked Guest. Application assignments, groups, app roles, Azure RBAC, entitlement packages, licenses, Conditional Access, and cross-tenant settings remain separate decisions.

## Separate Four Independent Questions

Many access reviews go wrong because they collapse these questions into one “guest or member” flag:

| Question | Relevant data | What it tells you |
| --- | --- | --- |
| Where does the person authenticate? | `identities`, home tenant, external identity provider | Which authority verifies the credential |
| How does the resource tenant classify them? | `userType` = `Guest` or `Member` | Their relationship and baseline directory permissions |
| What resources can they use? | Groups, app assignments, app roles, Azure RBAC, SharePoint/Teams policies | Their actual authorization |
| Who manages their lifecycle? | Sponsor, access package, cross-tenant sync, access review, HR process | How access is granted, reviewed, and removed |

Changing `userType` answers only the second question. It does not move the account to another identity provider, redeem an invitation, assign an application, or revoke existing resource permissions.

## The Four Combinations Entra Can Represent

Microsoft's B2B properties documentation distinguishes four useful combinations:

| Authentication relationship | `userType` | Typical meaning |
| --- | --- | --- |
| External identity | Guest | Conventional partner, supplier, or customer collaborator |
| External identity | Member | Person from another tenant treated as part of a wider organization |
| Internal identity | Guest | Locally authenticated account intentionally restricted as a guest |
| Internal identity | Member | Conventional employee or internal workforce account |

This is why a `#EXT#` user principal name, an email domain, or `userType` alone cannot prove how the user authenticated. Inspect the resource-tenant user object's `identities` collection. An Entra-homed external identity commonly shows `ExternalAzureAD`; other federation or email one-time-passcode identities use different issuer values.

## What Changes When UserType Is Guest

By default, Guest users have limited ability to enumerate directory data. The exact baseline depends on the tenant's **External collaboration settings**:

- guests can have the same directory access as members;
- guests can have limited access to directory object properties and memberships; or
- guests can be restricted largely to their own directory object.

Those settings govern Microsoft Entra directory visibility. They do not automatically deny access to every application. A Guest can still receive an application assignment, an app role, group membership, an Azure role, or access to a collaboration resource when policy permits it.

Likewise, setting **Assignment required** on an Enterprise application is separate from `userType`. If assignment is required, assign the external user or an eligible group. If it is not required, other consent and authorization rules determine whether sign-in is allowed.

Guest users can also hold directory roles. That is powerful and should be exceptional, reviewed, and time-bound; “Guest” is not a security sandbox once privileged roles are assigned.

## What Changes When UserType Is Member

An external Member receives the resource tenant's member-level baseline rather than the default guest restrictions. This pattern is used in some multitenant organizations where workers in another tenant are considered part of the same enterprise.

Member classification can have broad consequences:

- directory read permissions can be less restrictive;
- dynamic group rules that test `userType` may add or remove access;
- license assignment and application targeting rules may behave differently;
- products can interpret Guest and Member differently; and
- governance reports that identify “external users” only by `userType eq 'Guest'` can miss external Members.

Do not convert a partner to Member merely to bypass one application's assignment problem. Fix the application's authorization or guest-support configuration. Treat Member as an organizational relationship backed by governance, not as a compatibility toggle.

Some Microsoft services have their own limitations or preview behavior for external Members. Validate the specific product before adopting this pattern broadly.

## Claims Do Not Replace the Resource-Tenant Directory Object

For tokens issued in a B2B scenario, distinguish these identifiers:

- `tid` identifies the tenant associated with the token's issuer and validation context;
- `oid` identifies the user object in that tenant and can differ for the same human across tenants;
- `idp`, when present, can identify an external identity provider; and
- `sub` is scoped to the issuer/client context and should be treated according to the token specification.

Do not use email or UPN as the durable authorization key. They can change, and B2B user principal names often contain the `#EXT#` convention.

Also do not assume every token contains `userType`. Claims differ by token type, endpoint version, resource, and optional-claims configuration. For a custom application:

1. validate the token's signature, issuer, audience, and lifetime;
2. key the local identity with stable tenant and subject/object identifiers appropriate to the token;
3. use app roles, scopes, or a server-side authorization store for access decisions; and
4. query Microsoft Graph in the resource tenant when lifecycle logic genuinely requires current `userType` or `identities`.

An access token is issued for its resource. A client application should not decode a token intended for another API and turn incidental claims into its authorization model.

## Invitation and Redemption State Is Separate

Inviting a B2B collaboration user creates a user object in the resource tenant before the invitation is accepted. Before redemption, `externalUserState` is typically `PendingAcceptance`. After successful redemption, the identity properties reflect the identity provider used.

Changing Guest to Member does not itself redeem the invitation. If sign-in fails, check:

- whether the invitation has been redeemed;
- whether the invited address now maps to a different home identity;
- whether cross-tenant access policy permits the relationship;
- whether the Enterprise application allows and assigns the user;
- whether Conditional Access requirements can be satisfied; and
- whether the target product supports that external-user scenario.

Invitation status, `userType`, and resource authorization are three different states.

## Conditional Access and Cross-Tenant Trust

The resource tenant controls access to its applications. Its Conditional Access policies can apply to B2B users, and cross-tenant access settings can control inbound and outbound collaboration.

For supported cross-tenant relationships, the resource tenant can choose whether to trust multifactor authentication or device claims from the user's home tenant. That trust does not turn a Guest into a Member and does not grant an application role. It affects how authentication requirements are satisfied.

Document both sides of the relationship:

- home tenant or external identity provider responsible for authentication;
- resource tenant responsible for the local B2B object and resource authorization;
- cross-tenant trust settings;
- application assignment and app roles; and
- sponsor or business owner responsible for periodic review.

## Lifecycle Differences and Failure Modes

The resource tenant owns the B2B user object even though another organization may own the credential. This creates two lifecycle planes.

If the home organization disables the account, authentication should stop, but the resource-tenant object and its assignments can remain until governance removes them. Conversely, deleting the resource-tenant B2B object removes local access even if the home identity still exists.

Build an explicit lifecycle:

1. require a sponsor or business owner;
2. grant access through groups, app roles, or entitlement packages rather than one-off assignments where possible;
3. set an expiry or recurring access review;
4. monitor invitation redemption and stale sign-ins;
5. remove resource assignments and the B2B object when the relationship ends; and
6. audit external Members separately so they are not hidden by Guest-only reports.

When converting `userType`, assess dynamic group membership, directory roles, licenses, app assignments, SharePoint and Teams behavior, and downstream provisioning. Conversion changes the same user object's classification; it is not a migration to a new account.

## A Safer Authorization Pattern

For an application used by internal and external people:

- validate identity with the resource tenant's configured issuer policy;
- assign application-specific roles such as `Orders.Reader` or `Orders.Approver`;
- map approved groups to those roles when group governance is reliable;
- enforce authorization using `roles` or a server-side policy decision;
- use `userType` only when the business rule truly depends on the person's organizational relationship; and
- log the resource-tenant object ID, tenant ID, role decision, and policy version without logging tokens.

This preserves the ability to support external Guests and Members without making their baseline directory classification the sole access-control boundary.

## Do Not Confuse B2B Collaboration with B2B Direct Connect

B2B direct connect is a separate cross-tenant collaboration mechanism used for scenarios such as Teams shared channels. It does not behave like a conventional B2B collaboration user object in the resource tenant. Confirm which External ID model the product uses before troubleshooting a missing Guest or attempting to convert `userType`.

## Official Documentation

- [Microsoft Entra External ID: B2B collaboration user properties](https://learn.microsoft.com/en-us/entra/external-id/user-properties)
- [Microsoft Entra External ID: Configure external collaboration settings](https://learn.microsoft.com/en-us/entra/external-id/external-collaboration-settings-configure)
- [Microsoft Entra External ID: Add B2B collaboration users](https://learn.microsoft.com/en-us/entra/external-id/add-users-administrator)
- [Microsoft identity platform: Access token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)
- [Microsoft Entra External ID overview](https://learn.microsoft.com/en-us/entra/external-id/external-identities-overview)

## Conclusion

Guest and Member describe a B2B user's relationship to the resource tenant and influence baseline directory permissions. They do not, by themselves, identify the authentication source or decide application access. Model authentication, tenant classification, authorization, and lifecycle separately; use stable tenant-scoped identifiers and app-specific roles; and govern external Members as carefully as Guests.

# Keep Authentication, Sessions, and Profiles Within Regional Data Boundaries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Residency, Authentication, Security, SaaS, Data Privacy

Description: Keep identity profiles, session stores, callbacks, logs, and optional identity-provider integrations within an explicit regional data policy.

---

Moving application databases into regional deployments does not automatically move authentication with them. A global identity provider can still store profiles, issue tokens containing personal attributes, send email through another region, and export authentication events to a central analytics system.

Treat identity as its own data flow. Define which identity records may be global and which must remain in the tenant's approved regional boundary.

## Map the Complete Sign-In Path

Trace discovery, redirects, authorization requests, token exchange, profile lookup, session creation, logout, account recovery, and administrator access. Include email and SMS providers, fraud detection, authentication logs, support tooling, and federated identity providers.

Distinguish the identity provider's service location from the user's location. A remote user's browser receives authentication information and application responses. If a requirement covers processing or access location, it needs an explicit rule for that interaction; regional server placement alone cannot establish the browser's geography.

## Select the Regional Identity Boundary

A practical design gives each approved regional deployment a trusted issuer, regional profile store, regional session store, and local callback endpoints. A discovery service returns an approved regional sign-in destination without collecting passwords or full profiles globally.

Verify service-specific behavior. Amazon Cognito's [regional data considerations](https://docs.aws.amazon.com/cognito/latest/developerguide/security-cognito-regional-data-considerations.html) describe regional profile storage and optional integrations that can send data elsewhere. Cognito also supports explicitly configured [multi-Region user-pool replication](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-multi-region.html), which synchronizes directory updates to a secondary region. Do not assume that every current user pool is necessarily a single-region data footprint.

Review the actual pool configuration, replicas, message-delivery integrations, Lambda triggers, and log exports. For another identity provider, obtain the same evidence rather than inferring it from a regional hostname.

## Bind Tenant, Issuer, and Audience

Maintain a server-side mapping between the tenant's placement and its allowed issuer and client configuration. Validate the token's issuer, audience, signature, expiry, and any protocol-specific requirements using a maintained library.

OpenID Connect requires issuer and audience validation and defines the meaning of the subject claim. Its [Core specification](https://openid.net/specs/openid-connect-core-1_0.html) also describes ID Token validation and UserInfo. Treat the issuer and subject together as an identity key; a subject value from one issuer is not automatically the same user at another issuer.

Do not accept a caller-supplied issuer URL and fetch arbitrary keys from it. Use preapproved issuer configuration, and verify that the authenticated identity has access to the selected tenant. A valid signature does not by itself establish tenant membership or permitted regional placement.

## Keep Tokens and Sessions Small

Prefer tokens with only the claims needed by their intended consumer. Avoid embedding addresses, customer documents, or large authorization profiles. A signed JWT is not necessarily encrypted; readers with access to a token can often decode its claims.

Keep browser session state in a regional store. For a server-side session, a typical cookie can be a random reference with attributes such as:

```http
Set-Cookie: __Host-session=random-session-reference; Path=/; Secure; HttpOnly; SameSite=Lax
```

This illustrative cookie uses a host-scoped name and omits `Domain`. The `__Host-` prefix requires `Secure`, `Path=/`, and no `Domain` in supporting browsers. `SameSite=Lax` is a starting choice, not a universal fit for every federated callback. Test your OIDC response mode, cross-site flows, and CSRF protections. See [MDN's Set-Cookie reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

Cookie attributes restrict browser behavior; they do not establish where the session store or backup resides. Avoid broad parent-domain cookies that unnecessarily expose a session reference to other regional hosts.

## Include Recovery, Logout, and Migration

Password reset, invitation, and account-unlock links should lead to the tenant's approved regional endpoint. Validate redirect destinations against an allowlist and avoid disclosing whether an arbitrary email address belongs to a region during discovery.

Keep logout and revocation state regional where required. Decide how a global suspension reaches each regional deployment without exporting the profile itself, and define what happens while that coordination is unavailable.

During a tenant region move, do not copy password hashes or identity-provider internals through an unsupported export. Use a documented provider migration path or require reauthentication and establish an explicit identity mapping. Invalidate or expire old sessions according to the migration policy.

## Verify More Than a Successful Login

Test initial sign-in, refresh, recovery, failed login, federated login, and support access using synthetic accounts. Inspect the destinations of profiles, session records, events, messages, and diagnostic logs.

A completed review should identify permitted issuers, regional stores, integration destinations, replica settings, and recovery behavior. Login success proves that authentication works; the data-flow evidence establishes whether it respects the regional boundary.

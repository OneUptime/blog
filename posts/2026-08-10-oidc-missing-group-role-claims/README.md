# Why OIDC Group or Role Claims Are Missing—and Where to Retrieve Authorization Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenID Connect, OIDC, OAuth 2.0, Authorization, Claims, RBAC

Description: Diagnose missing OIDC group and role claims, then choose the right token, UserInfo, directory, or application data source for authorization.

---

An OpenID Connect login can be completely valid even when neither `groups` nor `roles` appears in the ID token. OIDC standardizes authentication and a core set of identity claims; it does not require every provider to publish an organization's authorization model in every token.

The practical fix is not to keep decoding the same token. First identify which component needs the authorization data and which protocol artifact the provider promises to put it in. The relying party may need a claim from UserInfo, an API may need a claim in its access token, or the application may need to read roles from its own database or a directory API.

## Groups and Roles Are Not Core OIDC Login Claims

OIDC Core defines standard profile claims such as `name`, `email`, and `updated_at`. It allows additional claims, but `groups` and `roles` are not members of that core profile set. A provider can support them as custom claims, namespaced claims, or claims defined by another profile. It can also omit them.

The distinction becomes clearer when the artifacts are separated:

| Artifact | Intended consumer | Primary purpose | Are groups or roles guaranteed? |
| --- | --- | --- | --- |
| ID token | The OIDC client identified by `aud` | Prove an authentication event and identify its subject | No |
| UserInfo response | The OIDC client holding the corresponding access token | Return authorized claims about that subject | No |
| Access token | The resource server identified by its audience | Authorize API access | Only when the authorization server's token profile promises them |
| Directory or SCIM API | An authorized administrative or application client | Retrieve or provision identity resources and memberships | Provider and permission dependent |
| Application database or policy service | The application | Enforce application-owned permissions | Defined by the application |

RFC 9068 registers `groups`, `roles`, and `entitlements` for JWT access tokens, but it does not make them mandatory. It says an authorization server that chooses to include those attributes should use those names and SCIM-compatible value shapes. That is an interoperability rule for claims that are present, not a requirement to issue them.

## Why a Claim Commonly Goes Missing

### You inspected the wrong token

An ID token is issued to the login client. An access token is issued for a protected resource. A provider may put profile claims in the ID token, API authorization claims in an access token, and additional identity claims in UserInfo. Those locations are not interchangeable.

Log token metadata, not raw production tokens, and identify:

```text
artifact: ID token | access token | UserInfo
issuer:   exact iss value
audience: expected client or API
scopes:   scopes actually granted
claims:   claim names only
```

Do not send an ID token to an API merely because it contains a convenient `roles` value. The API is normally not its intended audience.

### The requested scope does not mean what you assumed

OIDC defines `profile`, `email`, `address`, and `phone` as voluntary claim bundles. It does not define a universal `groups` or `roles` scope. A provider-specific scope works only if that provider documents it, the client is permitted to request it, the user or administrator grants it, and the relevant endpoint maps it to a claim.

Likewise, the OIDC `claims` request parameter can ask a supporting provider for an individual claim, but a request is not a guarantee. Providers can omit requested values for privacy reasons, and unsupported parameters or claims may be ignored according to the selected provider behavior.

### The client or authorization server lacks a claim mapping

Many deployments require an explicit mapper, token customization rule, authorization-server policy, or client assignment. Check the configuration attached to the exact issuer and client registration. A mapper added to a different tenant, realm, authorization server, API resource, or environment will not affect this token.

Also verify the mapper's destination. "Add to ID token," "add to access token," and "add to UserInfo" are separate switches in many products.

### The user has no effective assignment

Confirm the subject is assigned to the expected group or application role and that the assignment is effective for this client or API. Distinguish organization groups, application roles, resource permissions, and OAuth scopes. They can have similar names while representing different authorization systems.

### You are looking at an old session or token

JWT claims are a snapshot taken when the token is issued. Changing a membership does not rewrite tokens already held by a client. Start a new authorization transaction or refresh tokens according to provider policy, then inspect the new artifact. Even UserInfo freshness is provider-defined; do not assume it is a real-time directory query.

### Middleware renamed or discarded the claim

Trace the value through four stages: raw validated artifact, OIDC library claim set, application principal, and authorization policy. Frameworks may map a URI claim name to `role`, flatten arrays, select one claim as the role source, or discard unknown claims. Capture claim names at each boundary without logging sensitive values.

## Choose the Correct Authorization Source

### Use the ID token for the client session only when the contract says so

It is reasonable for an OIDC client to copy a documented role snapshot from a validated ID token into its local session. The client must still validate the token's issuer, signature, audience, lifetime, nonce when applicable, and any `azp` requirements. Treat the role as bounded by the token or application-session lifetime.

This pattern is a poor fit for rapidly changing privileges, central "disable now" controls, or authorization at an unrelated API. An ID token proves login to its relying party; it is not a general API credential.

### Call UserInfo for claims the provider exposes there

The UserInfo endpoint is an OAuth protected resource. Call the discovered `userinfo_endpoint` with the access token issued by the OIDC flow:

```http
GET /userinfo HTTP/1.1
Host: id.example.com
Authorization: Bearer ACCESS_TOKEN
```

UserInfo always returns `sub`, but other claims remain conditional. Critically, compare its `sub` exactly with the `sub` from the validated ID token. OIDC Core requires the client to discard the UserInfo values if the subjects differ. This check prevents token substitution from attaching another user's profile or group data to the current login.

Use UserInfo when the provider documents the desired claim there and the client has the required scopes. Do not assume UserInfo is a universal group endpoint.

### Put API authorization in the API's access token profile

For a resource server, a JWT access token can carry `groups`, `roles`, `entitlements`, and `scope`. The API must validate the access token as an access token, including its type/profile, exact issuer, signature, audience, expiration, and authorization claims. Under RFC 9068, `aud` identifies the resource and `client_id` identifies the OAuth client; this is different from ID-token audience processing.

This works well for low-latency decisions whose acceptable staleness is the access-token lifetime. Keep the claims resource-specific and small. A global directory dump in every token increases disclosure, header size, and stale-privilege risk.

### Use a directory, SCIM, or application policy store for current data

SCIM defines APIs and schemas for retrieving and provisioning Users and Groups, but an OIDC login does not automatically grant SCIM access. Use a separately authorized directory or provider API when the application genuinely needs directory membership and the provider supports that access model.

Application roles often belong in the application itself. Map the stable OIDC principal key—normally the tuple `(iss, sub)`—to local roles, tenant membership, ownership, or policy records. This avoids coupling business permissions to display names or mutable email addresses.

## A Repeatable Troubleshooting Runbook

1. Record the exact issuer, client ID, API resource, grant, requested scopes, and granted scopes.
2. Identify whether the failing component is the login client or a resource server.
3. Inspect the validated ID-token claim names, access-token profile or introspection response, and UserInfo response separately.
4. Read the provider's documentation for the claim name, required scope, mapper, destination, consent, and assignment rules.
5. Verify `(iss, sub)` and the user's effective assignments in the same tenant and environment.
6. Obtain a newly issued token after configuration or membership changes.
7. Trace the claim through framework mapping into the final authorization policy.
8. If no provider artifact has an appropriate claim contract, use an authorized directory API or an application-owned policy store.

Fail closed when a required authorization claim is absent. "Missing" must not mean "allow by default," and a profile claim such as `email_verified` is not a substitute for an application role.

## Design for Freshness and Revocation

Every embedded authorization claim has a staleness window. Document whether changes take effect at access-token renewal, at the next OIDC login, at application-session refresh, or after a live policy lookup. Shorter access-token lifetimes reduce stale decisions but increase renewal traffic; live lookups improve freshness but add latency and availability dependencies.

For high-impact operations, combine a validated token identity with a current application-side decision. For ordinary operations, a short-lived, resource-specific access-token claim may be enough. The correct answer depends on the consequence of a revoked role remaining effective until the next refresh—not on which token is easiest to decode.

## Sources

- [OpenID Connect Core 1.0 — ID Tokens and Claims](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 9068 — JWT Profile for OAuth 2.0 Access Tokens](https://datatracker.ietf.org/doc/html/rfc9068)
- [RFC 7643 — SCIM Core Schema](https://datatracker.ietf.org/doc/html/rfc7643)
- [RFC 7644 — SCIM Protocol](https://datatracker.ietf.org/doc/html/rfc7644)

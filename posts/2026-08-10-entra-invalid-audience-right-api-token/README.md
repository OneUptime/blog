# `Invalid Audience` in Entra: Requesting a Token for the Right API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, Access Tokens, Audience, OAuth 2.0, Scope, Web API, Token Validation

Description: Fix Entra invalid-audience failures by requesting a scope for the target API and validating only the access-token audience defined by that resource.

---

An access token's `aud` claim identifies the resource API for which Microsoft Entra issued it. An API must reject a token intended for a different resource even when the signature, issuer, and expiry are valid.

The fix is not to disable audience validation or add every observed value to an allowlist. Request a new access token for the API you are actually calling, then configure that API to validate its documented audience and token version.

## The Resource Owns the Access Token

Microsoft's access-token documentation describes two parties:

- the **client**, which requests and presents the token; and
- the **resource**, which accepts and validates it.

The resource controls its token contract. A client should treat access tokens as opaque and should not make authorization decisions from their contents. The API validates them.

This boundary prevents token substitution:

```text
Token A: aud = Microsoft Graph
Token B: aud = Orders API

Orders API must reject Token A.
```

Both tokens can come from the same tenant and be signed by Microsoft Entra. Signature trust does not make Token A valid at Orders API.

## Scopes Select the Target Resource

On the v2 endpoint, requested OAuth scopes identify the resource. For Microsoft Graph:

```text
scope=https://graph.microsoft.com/User.Read
```

For a custom Orders API exposing `Orders.Read`:

```text
scope=api://11112222-bbbb-3333-cccc-4444dddd5555/Orders.Read
```

The identifier before the final scope segment belongs to the API. The permission after it is a delegated scope that API exposes.

For client credentials, on-behalf-of, and other static-consent scenarios that require it, request the resource's `.default`:

```text
scope=api://11112222-bbbb-3333-cccc-4444dddd5555/.default
```

That means “request a token for this resource using the permissions granted for it”; where interactive consent applies, Entra can prompt for the configured required permissions. It does not mean “use default permissions for whichever API I call later.”

Microsoft Entra does not support combining scopes from multiple resources in one access-token request. Acquire a separate token for each API.

## A Correct Client-Credentials Request

For an app-only call to a custom API:

```http
POST https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id=<calling-client-id>
&scope=api%3A%2F%2F<orders-api-client-id>%2F.default
&client_secret=<url-encoded-secret>
&grant_type=client_credentials
```

If the API uses application permissions, the API registration-not the calling client-must expose the corresponding app role. The caller's service principal must be assigned that role in the resource tenant, normally through admin consent.

For delegated authorization code, request the exposed delegated scope:

```text
openid profile api://<orders-api-client-id>/Orders.Read
```

The OIDC scopes support sign-in. The API scope selects the resource access token. Do not send the returned ID token to the API.

## ID Token vs Access Token

An ID token is issued to the OIDC client and normally has the client's ID as its audience. It tells the client about the user authentication event.

An access token is issued for a resource API. If the browser application sends its ID token in `Authorization: Bearer`, the API must reject it. With separate client and API registrations, audience validation fails because the ID token was addressed to the client, not the API.

Send:

```http
Authorization: Bearer <access-token-for-orders-api>
```

Do not make the API accept both the client ID and API ID merely to accommodate token confusion.

## Custom API Configuration

For a custom API:

1. Register or identify the API application.
2. Under **Expose an API**, configure its Application ID URI.
3. Define delegated scopes and/or app roles.
4. Add those permissions to the client application.
5. Grant the required user or admin consent.
6. Request the API's scope or `.default`.
7. Configure API middleware for the trusted tenant/issuer and the API's token version/audience.
8. Enforce `scp` or `roles` after validation.

The API's `requestedAccessTokenVersion` influences the version of access token Entra issues for that resource, independent of whether the client calls a v1 or v2 endpoint. Follow the token contract for that version. Microsoft's claims documentation notes that audience representation can differ between token versions; do not copy an audience value from an unrelated API or token type.

Use maintained Microsoft identity middleware or an OAuth/JWT library that supports issuer metadata and explicit audience validation. “Decode succeeded” is not validation.

## A Diagnostic Workflow

### 1. Confirm the HTTP credential

Determine whether the client sends:

- an access token;
- an ID token;
- a refresh token;
- a token for a downstream API; or
- a session cookie mistakenly placed in the bearer header.

Inspect the token response field name in the client, not just the fact that the value has three JWT-looking segments.

### 2. Record the intended API

Write down its:

- client/Application ID;
- Application ID URI;
- exposed scope or app role;
- accepted token version; and
- expected issuer/tenant model.

### 3. Record the requested scope

Capture the scope names without logging authorization codes, client secrets, or full tokens. If the request uses only `https://graph.microsoft.com/.default`, the resulting token is for Graph, not your API.

### 4. Compare the resource contract

In a secure local diagnostic environment, when the credential is a decodable JWT issued for an API you own, inspect only the claim metadata needed to compare `aud`, `iss`, `tid`, token version, `scp`, and `roles`. For an opaque token, rely on the requested scopes and token-response metadata. Do not paste a production bearer token into public tools.

### 5. Fix the request, not the validator

Request the target API's permission and acquire a fresh token. Clear or bypass any custom application-level token cache while testing so an old wrong-audience token does not obscure the fix.

### 6. Verify authorization

Once audience validation succeeds, a 403 can still be correct if the token lacks the operation's required scope/role or application policy denies the subject.

## Calling More Than One API

A client that calls Microsoft Graph and Orders API needs separate tokens:

```text
Graph token:  scope=https://graph.microsoft.com/User.Read
Orders token: scope=api://<orders-api-client-id>/Orders.Read
```

Use the authentication library's token cache and let it select entries using its documented account, authority/tenant, client, resource/scopes, and authorization context. Do not add an application-level cache that maps a user to a single raw access token; it can return a valid token for the wrong API.

If API A needs to call API B for the current user, use the Microsoft identity platform on-behalf-of flow. API A must not forward its incoming API-A token directly to API B; it must exchange that token for an API-B token. For app-only downstream work, acquire a client-credentials token for API B according to the intended trust model.

## Common Entra Audience Mistakes

### Requesting `User.Read` without a resource identifier

Microsoft's v2 endpoint assumes Microsoft Graph when the resource identifier is omitted. That produces a Graph token.

### Using the calling client's `.default`

`.default` must be prefixed with the **resource API's** identifier. Requesting the client's own identifier does not create a token for an unrelated downstream API.

### Treating `scope` as an authorization-server-global name

Scopes belong to a resource. `Orders.Read` for one API is not interchangeable with a similarly named scope on another.

### Accepting a Microsoft Graph token in a custom API

Graph owns and validates Graph tokens. A custom API should never expand its accepted audiences to include Graph.

### Validating Graph tokens in the client

Microsoft tells clients to treat access tokens as opaque. Only the resource should validate them. Do not build client behavior around Graph token claims.

### Using one validator for ID and access tokens

Separate OIDC client validation from API access-token validation. Each has a distinct protocol purpose and validation requirements.

## Security Rules

- Require an exact, configured resource audience according to the API's token contract.
- Validate the exact trusted issuer model, signature, lifetime, and token version.
- Reject tokens for another tenant unless multitenancy is explicitly supported and authorized.
- Enforce scopes for delegated requests and roles/ACL policy for app-only requests.
- Never turn off audience validation to fix deployment pressure.
- Never log bearer tokens.
- Use TLS and maintained token-validation middleware.
- Keep downstream tokens audience-specific.

## Official Documentation

- [Access tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [Scopes and permissions in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc)
- [Access token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)
- [OAuth 2.0 client credentials flow on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Microsoft identity platform and OAuth 2.0 on-behalf-of flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow)
- [OAuth 2.0 Resource Indicators](https://www.rfc-editor.org/rfc/rfc8707.html)

## Conclusion

An invalid audience is evidence that the client presented the wrong token to the API or the API is configured for the wrong token contract. Request a scope belonging to the target resource, use `{resource}/.default` where required, acquire separate tokens for separate APIs, and send the access token rather than the ID token. Keep audience validation strict; change token acquisition, not the security boundary.

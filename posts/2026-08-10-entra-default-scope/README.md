# What Does the `.default` Scope Mean in Microsoft Entra ID?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, OAuth 2.0, Scopes, .default, Client Credentials, Consent

Description: Understand Entra's resource-specific .default scope, static consent, client-credentials behavior, trailing-slash edge cases, and why it cannot be mixed with dynamic scopes.

---

In Microsoft Entra ID, `{resource}/.default` means: **request a token for this resource using the permissions that have been statically configured and granted for the client**. It is a resource-specific shorthand, not a universal “give me normal permissions” switch.

Examples:

```text
https://graph.microsoft.com/.default
api://11112222-bbbb-3333-cccc-4444dddd5555/.default
```

The prefix selects the API. `.default` tells Entra to use that client-resource relationship rather than naming a new dynamic delegated scope in the request.

## What “Default” Does Not Mean

It does not mean:

- every permission the API offers;
- every permission an administrator could grant;
- a token for all configured APIs;
- no consent is required;
- the API may skip scope/role checks; or
- Microsoft Graph unless the resource identifier actually is Graph.

The word describes the statically configured permission set for a particular resource.

## Static vs Dynamic Consent

With dynamic consent, an interactive client requests individual delegated scopes:

```text
scope=openid profile https://graph.microsoft.com/User.Read
```

The application can later request another Graph scope, such as `Mail.Read`, when the user reaches that feature.

With static consent, the app registration lists required resource access ahead of time. A request for the resource's `.default` refers to that configured list. If consent is needed in a user flow, Entra can present the configured permissions for approval.

Microsoft documents an important side effect: a `.default` consent prompt can include all required permissions statically listed by the client application, including permissions across APIs in that configured list, even though the returned access token is still for one resource. Review the app registration's complete **API permissions** page before triggering tenant-wide consent.

## Client Credentials Requires `.default`

Client credentials has no user and no dynamic delegated scope selection. The client requests:

```http
POST https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id=<calling-client-id>
&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default
&client_secret=<url-encoded-secret>
&grant_type=client_credentials
```

Entra includes the application permissions—app roles—that have already been granted to the client for Microsoft Graph. You cannot request an individual application permission like this:

```text
scope=https://graph.microsoft.com/User.Read.All
```

That name is configured and admin-consented as an application permission, then represented through Graph's `.default` token request.

The same pattern applies to a custom API:

```text
scope=api://<orders-api-client-id>/.default
```

The Orders API must still validate `aud` and require the expected `roles` value. A successful token response does not prove that a particular role is present.

## Delegated Flows Can Use It Too

`.default` is not limited to daemons. Microsoft supports it in OAuth flows generally and requires it in scenarios including on-behalf-of.

In a delegated context, the token reflects delegated permissions granted for the signed-in user/client-resource relationship. If an existing grant covers `User.Read` and `Mail.Read` for Graph, a Graph `.default` request can return those granted scopes according to the current consent state.

This is different from requesting one explicit dynamic scope. Use explicit scopes for incremental-consent user experiences. Use `.default` when the protocol or static-consent design requires the configured permission set.

## You Cannot Mix `.default` and Dynamic Scopes

Microsoft explicitly rejects a request that combines static and dynamic consent for a resource:

```text
scope=https://graph.microsoft.com/.default Mail.Read
```

Choose one model for that request:

```text
Static:  scope=https://graph.microsoft.com/.default
Dynamic: scope=https://graph.microsoft.com/Mail.Read
```

OIDC scopes such as `openid`, `profile`, and `offline_access` follow their documented rules, but do not use a `.default` request as a bag into which arbitrary API permission names can be added.

## One Resource Per Access Token

An OAuth access token is for a resource. If an app calls Microsoft Graph and a custom Orders API, acquire two tokens:

```text
Graph:  https://graph.microsoft.com/.default
Orders: api://<orders-api-client-id>/.default
```

Do not send the Graph token to Orders API. The audience will be wrong. Do not ask for both resources in one scope parameter; Microsoft Entra rejects multi-resource scope requests.

Token caches must distinguish the target resource/scopes, authority, client, and account or workload context. A cache keyed only by user or client can return a valid but wrong-audience token.

## v1 `resource` Equivalence

Microsoft's v1 endpoint used a `resource` parameter:

```text
resource=https://graph.microsoft.com
```

For migration purposes, Microsoft documents v2:

```text
scope=https://graph.microsoft.com/.default
```

as functionally equivalent to requesting that v1 resource. Do not send both patterns to the same endpoint or assume every non-Microsoft authorization server implements `.default`. It is Microsoft identity platform behavior, not a general OAuth scope defined by RFC 6749.

## Resource Identifier and Trailing Slash

Construct `.default` from the exact resource identifier:

```text
<resource-identifier> + /.default
```

Some identifier URIs are registered with a trailing slash. Microsoft documents cases where preserving that slash results in a double slash before `.default`. Do not normalize resource identifiers by intuition; follow the target API's current documentation and app registration.

For custom APIs, inspect **Expose an API > Application ID URI**. A mismatch between:

```text
api://<api-client-id>
https://api.contoso.example
https://api.contoso.example/
```

can lead to invalid-scope, wrong-resource, or audience-validation failures.

## Consent and Grant Behavior

The app registration's configured permissions are requests, not grants. For user delegated permissions:

- some can be user-consented if tenant policy permits;
- some require admin consent; and
- tenant-wide admin consent can preapprove them for users.

Application permissions require admin consent. The resource service principal receives an app-role assignment for the client service principal.

Changing the configured required permissions does not automatically grant them. Likewise, restricting future user consent does not revoke existing grants. Review the enterprise application's permission grants explicitly.

## Troubleshooting `.default`

### Token has the wrong audience

The resource prefix is wrong. Request `.default` for the target API, not for the client or Graph by habit.

### App-only token lacks `roles`

Confirm the target API exposes an application role, the client service principal has that role assignment/admin consent in the issuing tenant, and the token audience is the API. Acquire a fresh token.

### User sees an unexpectedly broad consent page

Review every statically configured API permission on the client registration. `.default` uses the static required-resource-access configuration for consent.

### Request says scope is invalid

Verify the resource Application ID URI, tenant, exposed permissions, exact slash behavior, and that static `.default` is not mixed with dynamic scopes.

### Graph works but custom API fails

They are separate resources with separate service principals, permissions, and audiences. Configure and grant the custom API permission, then request its identifier.

### API accepts token but operation returns 403

Token issuance and authorization are separate. Check `scp` or `roles` and the API's business policy.

## Safe Examples

### Daemon calling Microsoft Graph

```text
Flow:        client credentials
Scope:       https://graph.microsoft.com/.default
Grant:       Graph application permission with admin consent
API checks:  Graph enforces its own token and permission contract
```

### Web API calling downstream API for a user

```text
Flow:        on-behalf-of
Scope:       api://<downstream-api-client-id>/.default
Grant:       delegated permission for downstream API
API checks:  downstream audience and delegated scopes
```

### Interactive app with incremental Graph access

```text
Flow:        authorization code with PKCE
Initial:     https://graph.microsoft.com/User.Read
Later:       https://graph.microsoft.com/Mail.Read
Avoid:       using .default when a narrow incremental prompt is intended
```

## Official Documentation

- [Scopes and permissions in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc)
- [Acquire tokens to call a web API using a daemon application](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-daemon-acquire-token)
- [OAuth 2.0 client credentials flow on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Developer's guide to requesting permissions and consent](https://learn.microsoft.com/en-us/entra/identity-platform/consent-types-developer)
- [Microsoft identity platform and OAuth 2.0 on-behalf-of flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow)
- [OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html)

## Conclusion

`.default` is Microsoft's resource-specific static permission scope. Prefix it with the API you need, use it where client credentials or on-behalf-of requires it, and grant the corresponding permissions beforehand. Do not mix it with dynamic API scopes, do not use one token for several resources, and do not confuse a successful token request with authorization at the API.

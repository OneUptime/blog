# Delegated vs Application Permissions in Entra ID: Which OAuth Flow Uses Each?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, OAuth 2.0, Delegated Permissions, Application Permissions, Client Credentials, Authorization

Description: Match delegated and application permissions to the correct Microsoft identity platform flows, consent model, token claims, and authorization boundary.

---

Microsoft Entra permissions describe **who the client is acting as**. Delegated permissions apply when an application calls an API on behalf of a signed-in user. Application permissions apply when the application calls an API as itself, with no user in the transaction.

The normal mapping is:

| Permission type | Acting identity | Typical OAuth flow |
| --- | --- | --- |
| Delegated permission, also called a scope | Client plus signed-in user | Authorization code with PKCE, device code, or on-behalf-of |
| Application permission, also called an app role for applications | Client application itself | Client credentials |

Consent, token contents, and the API's authorization checks differ between those models. Choosing the flow first and clicking whichever permission makes the error disappear is unsafe.

## Delegated Permissions

A delegated permission authorizes a client to call an API **on behalf of a user**. Microsoft Graph models these permissions as OAuth scopes. A v2 access token commonly lists the granted scopes in the `scp` claim:

```json
{
  "aud": "00000003-0000-0000-c000-000000000000",
  "azp": "11112222-bbbb-3333-cccc-4444dddd5555",
  "oid": "user-object-id",
  "scp": "User.Read Mail.Read",
  "tid": "tenant-id"
}
```

The effective authorization is not “whatever the scope says.” It is constrained by:

1. the delegated permission granted to the client;
2. the signed-in user's own access to the data;
3. resource-specific policy; and
4. the API operation being called.

For example, delegated `Mail.Read` does not let an ordinary user read every mailbox. The app is acting through that user's context, and Microsoft Graph applies the user's data access.

### Flows That Produce Delegated Access

Use the **authorization code flow with PKCE** for interactive web, native, and single-page clients. A confidential web application can also authenticate itself while redeeming the code, but the resulting access is still delegated because the authorization grant came from a user.

Use the **device authorization grant** for input-constrained clients that cannot host a normal browser redirect. A user completes authentication on another device, so the token still represents delegated access.

Use the **on-behalf-of flow** when API A receives a user-delegated token and needs a new delegated token for downstream API B. OBO preserves user context; it is not application permission merely because a backend performs the exchange.

Avoid the implicit flow for new applications. Microsoft recommends authorization code with PKCE. The resource owner password credentials flow is also unsuitable for modern deployments and cannot satisfy many authentication policies.

## Application Permissions

An application permission lets a workload call an API using its own service principal, without a signed-in user. For APIs that expose app roles, granted application permissions normally appear in the `roles` claim:

```json
{
  "aud": "00000003-0000-0000-c000-000000000000",
  "azp": "11112222-bbbb-3333-cccc-4444dddd5555",
  "idtyp": "app",
  "oid": "client-service-principal-object-id",
  "roles": ["User.Read.All"],
  "tid": "tenant-id"
}
```

With a standard app registration, the client uses the **client credentials flow** and authenticates with a certificate, federated credential, or—only when necessary—a client secret:

```http
POST https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id=11112222-bbbb-3333-cccc-4444dddd5555
&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default
&client_secret=<url-encoded-secret>
&grant_type=client_credentials
```

Client-credentials requests use `{resource}/.default`. They cannot request an individual application permission by placing its name in `scope`. Entra includes the application permissions already granted for that resource.

An eligible Azure-hosted workload can instead acquire an app-only token through the managed identity service. Its code doesn't present a client secret or certificate to Microsoft Entra ID; Azure manages the underlying credential and authenticates the environment. Managed identity is therefore an app-only access option, but the workload's token request isn't the `grant_type=client_credentials` request shown above.

Because there is no user, application permissions can be broad. An API permission such as `User.Read.All` is not limited to the human who created the app or the administrator who consented. The API must enforce the app role and any resource-specific restrictions.

The token snippets in this post illustrate common claim shapes; they are not a contract for Microsoft Graph tokens. A client must treat an access token for an API it doesn't own as an opaque string. Only the target resource API validates and relies on that token, and Microsoft-owned APIs can use token formats that clients can't decode as JWTs.

## Consent Is Different for Each Type

Delegated permissions can receive:

- **user consent**, if tenant policy allows the user to grant that permission;
- **tenant-wide admin consent**, which preauthorizes delegated permissions for users in the tenant; or
- a principal-specific delegated grant created by an authorized administrator.

Application permissions require administrator consent. The resulting assignment connects the client service principal to an app role exposed by the resource service principal.

Admin consent does not choose which employees may sign in to an enterprise application. That is a separate assignment/access-management decision.

## Do Not Infer the Model from One Claim Alone

For Microsoft identity platform v2 access tokens, `scp` is associated with delegated permissions and `roles` can represent app-role assignments. However, a user token can also contain `roles` when that user or their assigned group has an app role. Some custom APIs can implement an application ACL model rather than app roles, and optional-claim configuration can affect diagnostic signals.

Determine the authorization model from:

- the OAuth grant used;
- whether a user participated;
- the target API's token contract;
- the trusted issuer and audience;
- `scp`, `roles`, and documented identity-type claims; and
- the assignment or permission grant in the resource tenant.

Never authorize merely because a claim with a familiar name exists.

## Pick the Model from the Workload

### Interactive application calling an API

Use delegated permissions and authorization code with PKCE. Request only the scopes needed for the current function, and use incremental consent if the API and tenant policy support it.

### Background job with no user

Use app-only access. For a standard confidential client, use application permissions and client credentials. Prefer managed identity for eligible Azure-hosted code, or workload identity federation with client credentials for a trusted external platform. Grant only the resource app roles required.

### Web API calling another API for the current user

Use on-behalf-of with delegated permissions. Do not replace the user token with client credentials unless the downstream operation intentionally needs app-only authority.

### Scheduled processing triggered by a user

The fact that a user originally configured the schedule does not keep an interactive user present forever. If the job must continue independently, design an app-only authorization model. Do not indefinitely store a user's refresh token as a shortcut without a documented requirement and lifecycle controls.

### API needing both user and daemon clients

Expose delegated scopes for user-based operations and app roles for workload operations. In the API, keep policies explicit:

```text
Delegated request: require scp = orders.read and enforce user/tenant policy
App-only request:  require roles contains Orders.Read.All and enforce workload policy
```

Do not make one permission name silently stand for both security contexts.

## Common Failure Patterns

### Requesting a delegated scope with client credentials

There is no user to delegate from. Configure an application permission on the target API, grant admin consent, and request the resource's `.default` scope.

### Expecting `scp` in an app-only token

Application permissions normally appear as roles. Validate the API's app-token contract instead of checking for a delegated scope.

### Expecting application permission to honor the admin's access

The admin approved the grant but is not the subject of the token. The service principal is the actor.

### Receiving a token for the wrong API

Permissions are resource-specific. Request scopes for one resource at a time and verify the token's `aud` at the resource server.

### Defining the role on the client registration

The target API exposes scopes and app roles. The client then requests those permissions. Define authorization capabilities on the resource/API registration, not only on the calling client.

## Security Checklist

- Prefer authorization code with PKCE for interactive clients.
- Never put a client secret in a browser, mobile app, or distributed desktop binary.
- Prefer managed identity, federation, or certificates for confidential workloads.
- Grant least-privilege permissions and review tenant-wide consent.
- Validate issuer, audience, lifetime, token version, and the required scopes or roles at the API.
- Apply resource-specific authorization after token validation.
- Monitor user, service-principal, and managed-identity sign-ins in their appropriate log categories.

## Official Documentation

- [Overview of permissions and consent in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview)
- [Scopes and permissions in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc)
- [Access token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)
- [OAuth 2.0 client credentials flow on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Microsoft identity platform and OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Authentication flow support in MSAL](https://learn.microsoft.com/en-us/entra/msal/msal-authentication-flows)
- [Managed identities for Azure resources](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview)
- [OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html)

## Conclusion

Delegated permissions mean a client acts with a signed-in user's context and normally use an interactive or on-behalf-of grant. Application permissions mean the service principal acts as itself and use client credentials. Model the actor first, configure the matching permission and consent, request a token for the correct resource, and have the API enforce the correct `scp` or `roles` contract.

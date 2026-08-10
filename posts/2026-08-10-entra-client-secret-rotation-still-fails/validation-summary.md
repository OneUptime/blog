# Validation Summary: Why a New Entra Client Secret Still Fails After Rotation: Deployment, Caching, and Encoding Checks

## Status
validated

## Post Type
Technical troubleshooting guide and secret-rotation incident-response runbook

## Technologies Covered
- Microsoft Entra ID app registrations and password credentials
- Microsoft Graph `passwordCredential`, `addPassword`, and `removePassword`
- OAuth 2.0 client credentials grant
- Microsoft Authentication Library (MSAL) application token caching
- Bash and curl
- `application/x-www-form-urlencoded` request encoding
- Secret managers and deployment rollouts
- Managed identities, workload identity federation, and certificate credentials

## Sources Consulted
- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Microsoft Graph passwordCredential resource type](https://learn.microsoft.com/en-us/graph/api/resources/passwordcredential?view=graph-rest-1.0)
- [Microsoft Graph application: addPassword](https://learn.microsoft.com/en-us/graph/api/application-addpassword?view=graph-rest-1.0)
- [Microsoft Graph application: removePassword](https://learn.microsoft.com/en-us/graph/api/application-removepassword?view=graph-rest-1.0)
- [Microsoft Graph servicePrincipal: addPassword](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-addpassword?view=graph-rest-1.0)
- [Application and service principal objects in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals)
- [OAuth 2.0 client credentials flow on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Acquire tokens to call a web API using a daemon application](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-daemon-acquire-token)
- [Acquire and cache tokens with MSAL](https://learn.microsoft.com/en-us/entra/msal/msal-acquire-cache-tokens)
- [MSAL.NET client credential flows and application token caching](https://learn.microsoft.com/en-us/entra/msal/dotnet/acquiring-tokens/web-apps-apis/client-credential-flows)
- [MSAL.NET AcquireTokenForClientParameterBuilder.WithForceRefresh](https://learn.microsoft.com/en-us/dotnet/api/microsoft.identity.client.acquiretokenforclientparameterbuilder.withforcerefresh?view=msal-dotnet-latest)
- [MSAL Node token caching](https://learn.microsoft.com/en-us/entra/msal/javascript/node/caching)
- [Access tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [Renew expiring application credentials](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/recommendation-renew-expiring-application-credential)
- [Service principal sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins)
- [Security best practices for application properties](https://learn.microsoft.com/en-us/entra/identity-platform/security-best-practices-for-app-registration)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [GNU Bash builtins](https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html)
- [RFC 6749: The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html)

## Issues Found
- The opening and application-pairing text treated every Entra password credential as an app-registration credential. Microsoft Graph can also associate password credentials directly with service principals. The wording was scoped to client secrets created in App registrations.
- The cache discussion generalized behavior to confidential-client libraries broadly. It was narrowed to MSAL, whose client-credentials implementations use an application token cache.
- The post said that starting a new process could force fresh token acquisition. A new process can restore or share a persistent/distributed cache, so it does not guarantee a cache miss. The canary guidance now requires an isolated, empty application token cache or a supported force-refresh technique.
- The verification checklist told the client to verify token audience and an app role. Clients must treat access tokens for APIs they do not own, including Microsoft Graph, as opaque, and custom APIs can authorize app-only callers with a resource ACL without a `roles` claim. The checklist now verifies the requested `/.default` resource, configured application permission/app-role assignment or resource ACL, and a successful API call.
- The credential-validity list mentioned workload clock/proxy behavior as an assertion-related cause. A shared-secret request has no time-bearing client assertion, and Entra evaluates the password credential's UTC start and end timestamps. The unrelated bullet was removed.
- The incident section used “revoke/delete” for a client secret, although Microsoft Graph models password-credential removal rather than a separate per-secret revoked state. It now says to remove the credential.
- The diagnosis table described the new secret itself as bad, even though a stale, mispaired, or transformed runtime value can produce the same behavior. It now describes failure of fresh acquisition with the new credential/configuration while a prior token remains cached.
- The documentation list linked to the authorization code flow even though the post implements client credentials. The link and label were replaced with Microsoft's client-credentials-flow documentation.

## Review Notes
- The Bash snippet is syntactically valid. curl's `--data-urlencode "client_secret@-"` form reads the secret from standard input, URL-encodes it as the `client_secret` form field, and combines it correctly with the other form fields.
- `--fail-with-body` is current but requires curl 7.76.0 or newer. A successful response contains a live access token on standard output; the post already warns readers to run the test only in an approved environment and dispose of the output securely.
- The AADSTS error-code descriptions, Value-versus-Secret-ID distinction, Graph `secretText`/`keyId` terminology, UTC validity-window behavior, overlap rotation sequence, issued-token caveat, and managed-identity/federation/certificate guidance were verified as accurate.

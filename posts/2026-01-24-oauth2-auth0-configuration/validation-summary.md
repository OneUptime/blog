# Validation Summary: How to Configure OAuth2 with Auth0

## Status
validated

## Post Type
Tutorial / Guide (step-by-step configuration walkthrough with code examples)

## Technologies Covered
- Auth0 (Universal Login, Management API, Resource Servers, Actions, Connections, RBAC)
- OAuth2 / OpenID Connect (authorization code + PKCE, client credentials, refresh tokens)
- node-auth0 (`auth0` npm package) Management SDK
- `@auth0/auth0-react` SDK (React SPA integration)
- `express-oauth2-jwt-bearer` (Express API token validation)
- `jsonwebtoken` + `jwks-rsa` (manual token debugging)
- SAML / social (Google) connections
- JavaScript / Node.js / React

## Sources Consulted
- node-auth0 ManagementClient API reference — https://auth0.github.io/node-auth0/classes/management.ManagementClient.html
- node-auth0 v5 migration guide (method renames, removal of `.data` wrapper on create) — https://github.com/auth0/node-auth0/blob/master/v5_MIGRATION_GUIDE.md
- node-auth0 repository / README — https://github.com/auth0/node-auth0
- auth0-spa-js `Auth0Client` reference (logout signature) — https://auth0.github.io/auth0-spa-js/classes/Auth0Client.html
- Auth0 Management API — Create a client — https://auth0.com/docs/api/management/v2/clients/post-clients
- `express-oauth2-jwt-bearer` documented options (`auth({ audience, issuerBaseURL, tokenSigningAlg })`, `requiredScopes`)

## Issues Found
1. **Legacy node-auth0 flat Management methods (would throw on the current SDK).** Every Management API call used the deprecated v2/v3 flat method style (`management.createClient`, `createResourceServer`, `createRole`, `addPermissionsInRole`, `createClientGrant`, `createConnection`, `getLogs`). These do not exist on the current SDK (v4/v5), which exposes namespaced sub-clients. Updated to the current v5 names:
   - `management.createClient(...)` → `management.clients.create(...)` (both occurrences)
   - `management.createClientGrant(...)` → `management.clientGrants.create(...)`
   - `management.createResourceServer(...)` → `management.resourceServers.create(...)`
   - `management.createRole(...)` → `management.roles.create(...)`
   - `management.addPermissionsInRole(...)` → `management.roles.permissions.add(...)`
   - `management.createConnection(...)` → `management.connections.create(...)` (both occurrences)
   - `management.getLogs(...)` → `management.logs.list(...)`
   The v5 `create` methods return the resource directly (no `.data` wrapper), so the existing `client.client_id` usage remains correct.
2. **Invalid `scope` constructor option.** The `ManagementClient` constructor was passed `scope: 'create:clients update:clients read:clients'`, which is not a valid option in node-auth0 v4/v5 (permissions are granted to the M2M application, not requested in the constructor). Removed it.
3. **`logs.list()` returns a paginated page, not an array.** The rate-limit Action checked `logs.length` directly. Updated to read the array off the page object (`const logs = logsPage.data || [];`) before the `logs.length >= 5` check, matching the v5 list-response shape.
4. **Deprecated auth0-react v1 logout call.** The `Dashboard` component called `logout({ returnTo: window.location.origin })`, which is the removed v1 signature — in auth0-react/auth0-spa-js v2 `returnTo` is ignored at the top level. Changed to `logout({ logoutParams: { returnTo: window.location.origin } })`, consistent with the v2 style already used in Step 8.

## Review Notes
- The `@auth0/auth0-react` configuration (`authorizationParams` with `redirect_uri`/`audience`/`scope`, `getAccessTokenSilently({ authorizationParams })`, `useRefreshTokens`, `cacheLocation: 'memory'`, and the `logoutParams`/`federated` logout in Step 8) is correct for the current v2 SDK.
- The `express-oauth2-jwt-bearer` middleware (`auth({ audience, issuerBaseURL, tokenSigningAlg })`, `requiredScopes(...)`, `req.auth.payload`) and the manual `jwks-rsa` + `jsonwebtoken` token-debugging example are accurate and current.
- The Auth0 Actions API usage (`onExecutePostLogin`, `api.idToken/accessToken.setCustomClaim`, `api.access.deny`, `api.multifactor.enable('any')`) is correct. Note that requiring `auth0` and instantiating a `ManagementClient` inside an Action requires the module to be added as a dependency in the Action's editor and consumes Management API rate limit on every login — a per-login `logs.list` rate-limiting pattern is functional but heavy; Auth0's built-in Attack Protection (brute-force / suspicious IP throttling, shown later in the post) is the recommended primary mechanism.
- Resource server / client field names (`app_type`, `token_endpoint_auth_method`, `grant_types`, `jwt_configuration`, `refresh_token` rotation settings, `signing_alg`, `token_lifetime`, `enforce_policies`, `scopes`) match the Management API schema.
- The post does not pin SDK versions. Readers on node-auth0 v4 (rather than v5) should note that `roles.permissions.add` was `roles.addPermissions`, `logs.list` was `logs.getAll`, and v4 wrapped responses in `.data` (including `create`). Pinning `auth0` and `@auth0/auth0-react` versions in a future revision would prevent drift.

# How to Configure OIDC Authentication in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Authentication, OIDC, SSO, RBAC

Description: Learn how to set up OpenID Connect (OIDC) authentication in Rancher for modern token-based single sign-on.

OpenID Connect (OIDC) is a modern authentication protocol built on top of OAuth 2.0. Rancher supports OIDC authentication with various identity providers including Keycloak, Auth0, Dex, and any OIDC-compliant provider. This guide covers configuring OIDC authentication in Rancher.

## Prerequisites

- Rancher v2.6 or later with admin access
- An OIDC-compatible identity provider
- The Rancher server accessible via HTTPS
- Admin access to your OIDC provider to create client applications

## Understanding OIDC vs SAML

While SAML uses XML-based assertions, OIDC uses JSON Web Tokens (JWT). OIDC is generally simpler to configure and better suited for modern applications. Rancher supports both, but OIDC is the recommended approach for new integrations with compatible providers.

## Step 1: Register Rancher in Your OIDC Provider

Create a client application in your OIDC provider. The following example uses Keycloak:

1. Log in to the Keycloak Admin Console.
2. Navigate to **Clients** and click **Create client**.

```plaintext
Client Type: OpenID Connect
Client ID: rancher
Client Authentication: ON (confidential)
```

3. Configure the redirect URI:

```plaintext
Valid Redirect URIs: https://rancher.example.com/verify-auth
Web Origins: https://rancher.example.com
```

4. Note the client credentials:

```plaintext
Client ID: rancher
Client Secret: (from the Credentials tab)
```

For Auth0:

1. Create a new Application (Regular Web Application).
2. Set **Allowed Callback URLs** to `https://rancher.example.com/verify-auth`.
3. Note the Client ID, Client Secret, and Domain.

## Step 2: Discover OIDC Endpoints

Find your provider's OIDC discovery endpoint:

```bash
# Keycloak

curl -s "https://keycloak.example.com/realms/your-realm/.well-known/openid-configuration" | jq

# Auth0
curl -s "https://your-domain.auth0.com/.well-known/openid-configuration" | jq

# Dex
curl -s "https://dex.example.com/.well-known/openid-configuration" | jq
```

The discovery document provides all required endpoints:

```json
{
  "issuer": "https://keycloak.example.com/realms/your-realm",
  "authorization_endpoint": "https://keycloak.example.com/realms/your-realm/protocol/openid-connect/auth",
  "token_endpoint": "https://keycloak.example.com/realms/your-realm/protocol/openid-connect/token",
  "userinfo_endpoint": "https://keycloak.example.com/realms/your-realm/protocol/openid-connect/userinfo",
  "jwks_uri": "https://keycloak.example.com/realms/your-realm/protocol/openid-connect/certs",
  "end_session_endpoint": "https://keycloak.example.com/realms/your-realm/protocol/openid-connect/logout"
}
```

## Step 3: Configure Group Claims

Ensure your OIDC provider sends group information in the userinfo response or in a claim Rancher can map.

For Keycloak:

1. In the Rancher client, go to **Client scopes** and open the dedicated client scope for the Rancher client.
2. Add the required mappers:

```plaintext
Groups Mapper
Mapper Type: Group Membership
Name: Groups Mapper
Token Claim Name: groups
Full group path: OFF
Add to ID token: OFF
Add to access token: OFF
Add to userinfo: ON

Client Audience
Mapper Type: Audience
Name: Client Audience
Included Client Audience: rancher
Add to ID token: OFF
Add to access token: ON

Group Path
Mapper Type: Group Membership
Name: Group Path
Token Claim Name: full_group_path
Full group path: ON
Add to ID token: ON
Add to access token: ON
Add to userinfo: ON
```

If Rancher needs to search Keycloak users or groups, assign the `query-users`, `query-groups`, and `view-users` roles to the relevant users or groups in Keycloak.

For Auth0, create an Action:

```javascript
// Auth0 Action - Map roles into a namespaced claim Rancher can use
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://rancher.example.com';
  if (event.authorization && event.authorization.roles) {
    api.idToken.setCustomClaim(`${namespace}/groups`, event.authorization.roles);
    api.accessToken.setCustomClaim(`${namespace}/groups`, event.authorization.roles);
  }
};
```

## Step 4: Configure OIDC in Rancher

Set up the OIDC authentication provider:

1. Log in to Rancher as an administrator.
2. Navigate to **Users & Authentication** then **Auth Provider**.
3. Select **Keycloak (OIDC)** for Keycloak, or **Generic OIDC** for another provider.

Enter the Keycloak configuration:

```plaintext
Client ID: rancher
Client Secret: <your-client-secret>
Keycloak URL: https://keycloak.example.com
Keycloak Realm: your-realm
Rancher URL: https://rancher.example.com
Endpoints: Specify (advanced)
Issuer: https://keycloak.example.com/realms/your-realm
Auth Endpoint: https://keycloak.example.com/realms/your-realm/protocol/openid-connect/auth
```

For Keycloak 17 and newer, use `Specify (advanced)` to override the generated `Issuer` and `Auth Endpoint`; generated values include `/auth`, which is only correct for Keycloak 16 or older.

For Auth0, Dex, or another OIDC-compliant provider, use **Generic OIDC** and provide the provider `Issuer`; Rancher uses OIDC discovery from the issuer when available.

## Step 5: Configure Claim Mappings

Rancher uses the `sub` claim as the unique PrincipalID, so it must be stable and immutable. With Generic OIDC, you can override the default `name`, `email`, and `groups` claims if your provider uses different names:

```plaintext
Custom Name Claim: name
Custom Email Claim: email
Custom Groups Claim: groups
```

For Auth0 with custom claims:

```plaintext
Custom Groups Claim: https://rancher.example.com/groups
```

## Step 6: Configure Scopes

Ensure your IdP client can issue the claims Rancher relies on. `openid` is required, while `profile`, `email`, and `groups` determine whether those claims are available:

```plaintext
Keycloak: openid profile email
Auth0: openid profile email
Dex: openid profile email groups
```

Use provider-specific mappers or Actions when group membership is not exposed by scope alone.

## Step 7: Test the OIDC Configuration

Rancher validates the configuration during the enable flow. After Rancher redirects you back from the IdP, verify that the returned user information is correct.

Check the returned claims:

```bash
# Export the token you want to inspect first, for example:
# export TOKEN='<id-token>'

python3 - <<'PY'
import os, json, base64
payload = os.environ["TOKEN"].split(".")[1]
payload += "=" * (-len(payload) % 4)
print(json.dumps(json.loads(base64.urlsafe_b64decode(payload)), indent=2))
PY

# Check Rancher logs
kubectl logs deploy/rancher -n cattle-system --tail=200 | grep -Ei 'oidc|auth|keycloak'
```

## Step 8: Enable OIDC Authentication

To complete setup:

1. Click **Enable** to activate OIDC authentication.
2. Confirm the action.

The login page will show the OIDC login button.

## Step 9: Map OIDC Groups to Rancher Roles

Assign roles based on OIDC groups:

1. Navigate to **Users & Authentication** then **Groups**.
2. Search for the OIDC group, or enter the exact group name manually if you are using a custom groups claim.
3. Assign roles.

```plaintext
OIDC Group: platform-admins -> Administrator
OIDC Group: devops -> Standard User
OIDC Group: developers -> Standard User
OIDC Group: viewers -> User-Base
```

For cluster-level access:

1. Navigate to a cluster and go to **Cluster Members**.
2. Add the OIDC group with the desired cluster role.

## Step 10: Advanced OIDC Configuration

### Rancher Token TTL

If you want to change Rancher's maximum API token TTL:

```bash
# Set token TTL
curl -sS \
  -X PUT \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"57600"}' \
  "https://rancher.example.com/v3/settings/auth-token-max-ttl-minutes"
```

### Logout Integration

If your IdP supports OIDC single logout (SLO), configure Rancher to use the `end_session_endpoint` from the discovery document and add the Rancher URL as an allowed post-logout redirect URI in the IdP client.

### Custom CA Certificates

If your OIDC provider uses a private CA:

1. Add the CA certificate chain to Rancher.
2. For Helm-based Rancher deployments that need additional trusted CAs, enable `additionalTrustedCAs=true` and create the trust secret:

```bash
kubectl -n cattle-system create secret generic tls-ca-additional \
  --from-file=ca-additional.pem=./ca-additional.pem
```

## Troubleshooting

Common OIDC issues:

| Issue | Cause | Solution |
|-------|-------|----------|
| Invalid redirect URI | Redirect mismatch | Ensure the redirect URI is exactly `https://rancher.example.com/verify-auth` |
| Token validation failed | Clock skew or incorrect issuer metadata | Sync NTP and verify the issuer and discovery document |
| Groups not returned | Missing mapper, custom claim, or provider-side group scope | Verify the Keycloak mapper or Auth0 Action and ensure the provider exposes the groups claim Rancher expects |
| Invalid client credentials | Wrong client secret | Regenerate and update the client secret |
| SSL handshake error | Untrusted CA | Add the certificate chain to Rancher and, if needed, configure `additionalTrustedCAs=true` |

## Best Practices

- **Use discovery endpoint**: Let Rancher discover endpoints automatically from the `.well-known/openid-configuration` URL when possible.
- **Configure proper claims**: Request only the scopes and custom claims Rancher actually needs.
- **Map groups to roles**: Use OIDC groups for role assignments instead of individual user mappings.
- **Monitor token expiration**: Configure appropriate token lifetimes in both the OIDC provider and Rancher.
- **Test logout flow**: Verify that logging out of Rancher properly terminates the OIDC session.

## Conclusion

OIDC authentication in Rancher provides a modern, standards-based approach to single sign-on. With support for JWT tokens, automatic key rotation via JWKS, and broad provider compatibility, OIDC is an excellent choice for integrating Rancher with your identity infrastructure. Configure your provider's group claims carefully to enable seamless role-based access control in your Kubernetes management platform.

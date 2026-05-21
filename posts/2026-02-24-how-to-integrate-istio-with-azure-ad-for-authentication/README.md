# How to Integrate Istio with Azure AD for Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Azure AD, Authentication, Microsoft Entra, OIDC

Description: How to set up Microsoft Entra ID (Azure AD) as your identity provider with Istio for enterprise authentication and group-based authorization policies.

---

If your organization runs on Microsoft 365 or Azure, chances are your users are already in Azure Active Directory (now called Microsoft Entra ID). Integrating Azure AD with Istio means your developers and services can authenticate using the same identities they already have, and Istio validates those tokens at the proxy level without any application changes.

Azure AD is a fully compliant OIDC provider, so the integration follows the same JWT validation pattern used with other identity providers. But Azure AD has its own quirks around token versions, audience claims, and group handling that you need to be aware of.

## Registering an Application in Azure AD

Go to the Azure Portal and navigate to Microsoft Entra ID > App registrations > New registration.

**For the app registration:**

- **Name**: Istio Mesh Services
- **Supported account types**: Accounts in this organizational directory only
- **Redirect URI**: Web - `https://app.mycompany.com/callback`

After creation, note the:
- **Application (client) ID**: Something like `12345678-abcd-4ef0-8123-123456789012`
- **Directory (tenant) ID**: Something like `abcdef01-2345-6789-abcd-ef0123456789`

Create a client secret under Certificates & secrets > New client secret.

## Configuring Token Settings

Azure AD has two token versions (v1 and v2), and they have different issuer URLs. You want v2 tokens for better OIDC compliance.

Go to App registrations > Your app > Manifest and set:

```json
{
  "accessTokenAcceptedVersion": 2
}
```

This ensures tokens use the v2 issuer format: `https://login.microsoftonline.com/{tenant-id}/v2.0`

**Add API permissions and scopes:**

Go to Expose an API and set the Application ID URI to `api://istio-mesh` or any URI you prefer.

Add scopes such as `read`, `write`, and `admin`. Clients request them by using the full scope URI:
- `api://istio-mesh/read`
- `api://istio-mesh/write`
- `api://istio-mesh/admin`

## Configuring Istio JWT Validation

Create the RequestAuthentication resource:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: azure-ad-jwt
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://login.microsoftonline.com/abcdef01-2345-6789-abcd-ef0123456789/v2.0"
      jwksUri: "https://login.microsoftonline.com/abcdef01-2345-6789-abcd-ef0123456789/discovery/v2.0/keys"
      audiences:
        - "12345678-abcd-4ef0-8123-123456789012"
      forwardOriginalToken: true
      outputPayloadToHeader: "x-jwt-payload"
```

Replace the tenant ID with your actual Azure AD tenant ID and the audience with the Application (client) ID of the API app registration. For Microsoft Entra v2 access tokens, the `aud` claim is the client ID of the web API.

For multi-tenant scenarios, the Microsoft Entra `common` metadata endpoint uses an issuer template, but the actual tokens still have tenant-specific issuers. Istio matches the issuer exactly, so configure the tenants you trust explicitly:

```yaml
jwtRules:
  - issuer: "https://login.microsoftonline.com/abcdef01-2345-6789-abcd-ef0123456789/v2.0"
    jwksUri: "https://login.microsoftonline.com/abcdef01-2345-6789-abcd-ef0123456789/discovery/v2.0/keys"
  - issuer: "https://login.microsoftonline.com/11111111-2222-3333-4444-555555555555/v2.0"
    jwksUri: "https://login.microsoftonline.com/11111111-2222-3333-4444-555555555555/discovery/v2.0/keys"
```

## Egress Configuration

If your mesh has strict egress rules, allow traffic to Azure AD endpoints:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: azure-ad
  namespace: istio-system
spec:
  hosts:
    - "login.microsoftonline.com"
    - "graph.microsoft.com"
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Authorization Policies

Basic authentication enforcement:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-azure-ad-auth
  namespace: default
spec:
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
      to:
        - operation:
            notPaths: ["/healthz", "/readyz", "/public/*"]
```

## Using Azure AD Groups

Azure AD groups are central to enterprise access management. To include them in tokens, you need to configure the app registration.

Go to App registrations > Your app > Token configuration > Add groups claim:

- Select "Security groups" or "All groups"
- For ID tokens and Access tokens, choose "Group ID" or "sAMAccountName" (for synced on-prem groups)

When you select Group ID, the JWT will include a `groups` claim with an array of Azure AD group object IDs:

```json
{
  "groups": [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222"
  ]
}
```

Use these in Istio policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: engineering-access
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://login.microsoftonline.com/abcdef01-2345-6789-abcd-ef0123456789/v2.0/*"]
      to:
        - operation:
            paths: ["/api/*"]
      when:
        - key: request.auth.claims[groups]
          values: ["11111111-1111-1111-1111-111111111111"]
```

Using object IDs is not great for readability. One alternative is to use Azure AD App Roles instead of groups, which give you human-readable role names in the token.

## Using App Roles

In your app registration, go to App roles and create roles:

- **Display name**: Admin
- **Value**: admin
- **Description**: Administrative access
- **Allowed member types**: Users/Groups

- **Display name**: Developer
- **Value**: developer
- **Description**: Developer access

Assign users or groups to these roles in Enterprise Applications > Your app > Users and groups.

Tokens will include a `roles` claim:

```json
{
  "roles": ["admin", "developer"]
}
```

Use in Istio policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-endpoints
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://login.microsoftonline.com/abcdef01-2345-6789-abcd-ef0123456789/v2.0/*"]
      to:
        - operation:
            paths: ["/admin/*"]
      when:
        - key: request.auth.claims[roles]
          values: ["admin"]
```

## Getting Tokens

User authentication (authorization code flow):

```text
https://login.microsoftonline.com/abcdef01-2345-6789-abcd-ef0123456789/oauth2/v2.0/authorize?
  client_id=12345678-abcd-4ef0-8123-123456789012&
  response_type=code&
  redirect_uri=https://app.mycompany.com/callback&
  scope=api://istio-mesh/read%20api://istio-mesh/write%20openid%20profile
```

Exchange the code for tokens:

```bash
TOKEN=$(curl -s -X POST \
  "https://login.microsoftonline.com/abcdef01-2345-6789-abcd-ef0123456789/oauth2/v2.0/token" \
  -d "client_id=12345678-abcd-4ef0-8123-123456789012" \
  -d "client_secret=your-client-secret" \
  -d "grant_type=authorization_code" \
  -d "code=the-auth-code" \
  --data-urlencode "redirect_uri=https://app.mycompany.com/callback" \
  --data-urlencode "scope=api://istio-mesh/read" | jq -r '.access_token')
```

Client credentials (service-to-service):

```bash
TOKEN=$(curl -s -X POST \
  "https://login.microsoftonline.com/abcdef01-2345-6789-abcd-ef0123456789/oauth2/v2.0/token" \
  -d "client_id=12345678-abcd-4ef0-8123-123456789012" \
  -d "client_secret=your-client-secret" \
  -d "grant_type=client_credentials" \
  --data-urlencode "scope=api://istio-mesh/.default" | jq -r '.access_token')
```

Note the `.default` scope for client credentials. Azure AD requires this for application permissions.

## Groups Overage

Azure AD has a limit on how many groups can be included directly in the token (typically 200 for JWT tokens). If a user belongs to more groups than the limit, Azure AD includes an overage claim such as `_claim_names` instead. Do not rely on the URL in `_claim_sources`; some tokens can still reference legacy Azure AD Graph endpoints.

To handle this, you either need a middleware that detects the overage claim and calls Microsoft Graph to resolve groups, or you should use App Roles instead (which are not subject to the same limits).

## Testing

```bash
# Decode token to check claims

echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .

# Test authenticated access
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  https://app.mycompany.com/api/data

# Test unauthenticated (should get 403)
curl -s -o /dev/null -w "%{http_code}" \
  https://app.mycompany.com/api/data
```

## Troubleshooting

**Token version mismatch**: If your app manifest has `accessTokenAcceptedVersion: null`, Azure AD issues v1 tokens with issuer `https://sts.windows.net/{tenant-id}/`. Set it to `2` for v2 tokens.

**NONCE error**: Azure AD v2 tokens sometimes include a `nonce` in the header that causes issues. Make sure you are using the correct JWKS endpoint for your token version.

**Audience mismatch**: For v2 access tokens, the audience is the Application (client) ID of the web API. Check the `aud` claim in your token and use that value in the Istio `audiences` list.

Azure AD integration gives Istio access to your existing enterprise identity infrastructure. Users, groups, roles, conditional access policies, and MFA all work through Azure AD, and Istio enforces authorization based on the identity data in the tokens.

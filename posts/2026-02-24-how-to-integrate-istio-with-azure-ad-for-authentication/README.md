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
- **Application (client) ID**: Something like `12345678-abcd-efgh-ijkl-123456789012`
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

Add scopes:
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
        - "api://istio-mesh"
      forwardOriginalToken: true
      outputPayloadToHeader: "x-jwt-payload"
```

Replace the tenant ID with your actual Azure AD tenant ID.

For multi-tenant scenarios where you accept tokens from any Azure AD tenant:

```yaml
jwtRules:
  - issuer: "https://login.microsoftonline.com/common/v2.0"
    jwksUri: "https://login.microsoftonline.com/common/discovery/v2.0/keys"
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
  client_id=12345678-abcd-efgh-ijkl-123456789012&
  response_type=code&
  redirect_uri=https://app.mycompany.com/callback&
  scope=api://istio-mesh/read api://istio-mesh/write openid profile
```

Exchange the code for tokens:

```bash
TOKEN=$(curl -s -X POST \
  "https://login.microsoftonline.com/abcdef01-2345-6789-abcd-ef0123456789/oauth2/v2.0/token" \
  -d "client_id=12345678-abcd-efgh-ijkl-123456789012" \
  -d "client_secret=your-client-secret" \
  -d "grant_type=authorization_code" \
  -d "code=the-auth-code" \
  -d "redirect_uri=https://app.mycompany.com/callback" \
  -d "scope=api://istio-mesh/read" | jq -r '.access_token')
```

Client credentials (service-to-service):

```bash
TOKEN=$(curl -s -X POST \
  "https://login.microsoftonline.com/abcdef01-2345-6789-abcd-ef0123456789/oauth2/v2.0/token" \
  -d "client_id=12345678-abcd-efgh-ijkl-123456789012" \
  -d "client_secret=your-client-secret" \
  -d "grant_type=client_credentials" \
  -d "scope=api://istio-mesh/.default" | jq -r '.access_token')
```

Note the `.default` scope for client credentials. Azure AD requires this for application permissions.

## Groups Overage

Azure AD has a limit on how many groups can be included directly in the token (typically 200 for v2 tokens). If a user belongs to more groups than the limit, Azure AD includes a `_claim_names` object instead, pointing to a Microsoft Graph endpoint.

To handle this, you either need a middleware that calls the Graph API to resolve groups, or you should use App Roles instead (which are not subject to the same limits).

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

**Audience mismatch**: For client credentials, the audience is the Application ID URI (`api://istio-mesh`). For delegated permissions, it might be the client ID. Check the `aud` claim in your token.

Azure AD integration gives Istio access to your existing enterprise identity infrastructure. Users, groups, roles, conditional access policies, and MFA all work through Azure AD, and Istio enforces authorization based on the identity data in the tokens.

# How to Configure Microsoft Azure AD (Entra ID) SSO with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure AD, Entra ID, SSO, OAuth

Description: Step-by-step guide to configuring Microsoft Azure Active Directory (now Entra ID) as the OAuth provider for Portainer single sign-on.

---

Azure AD (now Microsoft Entra ID) is one of the most common identity providers in enterprises. Integrating it with Portainer allows your organization's Microsoft 365 credentials to work for container management access.

## Step 1: Register Portainer in Azure AD

1. Go to the [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID > App registrations**
3. Click **New registration**
4. Name the app (e.g., "Portainer")
5. Set **Redirect URI**: `https://portainer.example.com/` (Web platform)
6. Click **Register**

Note the **Application (client) ID** and **Directory (tenant) ID**.

## Step 2: Create a Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Set description and expiry
4. Copy the **Value** immediately (shown only once)

## Step 3: Configure API Permissions

1. Go to **API permissions**
2. Ensure delegated Microsoft Graph permissions `User.Read` (granted by default), `openid`, `profile`, and `email` are present
3. Click **Grant admin consent**

## Step 4: Configure Portainer OAuth with Azure AD

The Azure AD OAuth endpoints follow this pattern:
- Tenant-specific: `https://login.microsoftonline.com/<tenant-id>/...`
- Common (multi-tenant): `https://login.microsoftonline.com/common/...`

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

TENANT_ID="your-tenant-id"
CLIENT_ID="your-client-id"
CLIENT_SECRET="your-client-secret"

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"AuthenticationMethod\": 3,
    \"OAuthSettings\": {
      \"ClientID\": \"$CLIENT_ID\",
      \"ClientSecret\": \"$CLIENT_SECRET\",
      \"AuthorizationURI\": \"https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/authorize\",
      \"AccessTokenURI\": \"https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token\",
      \"ResourceURI\": \"https://graph.microsoft.com/v1.0/me\",
      \"RedirectURI\": \"https://portainer.example.com/\",
      \"LogoutURI\": \"https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/logout\",
      \"UserIdentifier\": \"userPrincipalName\",
      \"Scopes\": \"openid profile email User.Read\",
      \"OAuthAutoCreateUsers\": true,
      \"AuthStyle\": 1
    }
  }" \
  --insecure
```

## Azure AD Configuration Summary

| Portainer Field | Azure AD Value |
|-----------------|---------------|
| Authorization URL | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` |
| Access Token URL | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` |
| Resource URL | `https://graph.microsoft.com/v1.0/me` |
| Logout URL | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/logout` |
| User Identifier | `userPrincipalName` |
| Scopes | `openid profile email User.Read` |
| Auth Style | `In Params` |

## Restrict Access to Specific Azure AD Groups

By default, all users in your tenant can log in. To restrict access:

1. In Azure Portal, go to your app registration
2. Navigate to **Enterprise Applications > [Your App]**
3. Under **Manage > Properties**, set **Assignment required** to **Yes**
4. Under **Manage > Users and groups**, add only the groups/users that should have access

## Verify Azure AD Login

1. Open Portainer in incognito/private browser
2. Click **Login with OAuth**
3. Sign in with your Microsoft account
4. Verify you're redirected back and logged in

---

*Monitor your Azure-integrated infrastructure with [OneUptime](https://oneuptime.com).*

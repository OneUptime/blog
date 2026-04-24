# How to Configure Microsoft Azure AD (Entra ID) SSO with Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure AD, Entra ID, SSO, OAuth, Microsoft

Description: Set up Single Sign-On with Microsoft Azure Active Directory (Entra ID) in Portainer using OAuth 2.0 / OpenID Connect.

## Introduction

Microsoft Azure Active Directory (now called Microsoft Entra ID) is the most commonly used enterprise identity provider. Configuring Portainer to use Azure AD SSO allows your organization's Microsoft 365 users to log in with their existing credentials. This guide provides exact configuration steps for the Azure portal and Portainer.

## Prerequisites

- Azure AD tenant with admin privileges
- Portainer running and accessible via HTTPS
- Portainer URL registered as a trusted redirect URI

## Step 1: Register the Application in Azure AD

1. Go to [portal.azure.com](https://portal.azure.com)
2. Navigate to **Azure Active Directory** (or Microsoft Entra ID)
3. Go to **App registrations** → **New registration**

Fill in:
```text
Name:                   Portainer SSO
Supported account types: Accounts in this organizational directory only
Redirect URI:           Web | https://portainer.example.com/
```

4. Click **Register**
5. Note the **Application (client) ID** and **Directory (tenant) ID**

## Step 2: Create a Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and expiry
4. **Copy the secret value immediately** - it's only shown once

## Step 3: Configure API Permissions

1. Go to **API permissions**
2. Confirm these delegated permissions are present:
   - `Microsoft Graph > openid`
   - `Microsoft Graph > profile`
   - `Microsoft Graph > User.Read`
3. If needed, click **Add a permission** → **Microsoft Graph** → **Delegated permissions** and add them (`email` is optional unless you plan to use an email-based claim in a custom override)
4. Click **Grant admin consent** if required by your organization

## Step 4: Configure Portainer

Portainer has a built-in Microsoft provider, so in Portainer Settings → Authentication → OAuth → Microsoft you only need:

```text
Tenant ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

Application ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Application key: (your secret value)
```

If you click **Override default configuration**, Portainer's current Microsoft defaults are:

```text
Authorization URL:      https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize
Access Token URL:       https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token
Resource URL:           https://graph.microsoft.com/v1.0/me
Logout URL:             https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/logout
Redirect URL:           https://portainer.example.com/
User Identifier:        userPrincipalName
Scopes:                 profile openid
```

Portainer's built-in Microsoft provider uses `userPrincipalName` from `https://graph.microsoft.com/v1.0/me` as the default user identifier.

## Step 5: Configure via API

```bash
TENANT_ID="your-tenant-id"
CLIENT_ID="your-client-id"
CLIENT_SECRET="your-client-secret"

TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d "{
    \"AuthenticationMethod\": 3,
    \"OAuthSettings\": {
      \"ClientID\": \"${CLIENT_ID}\",
      \"ClientSecret\": \"${CLIENT_SECRET}\",
      \"AuthorizationURI\": \"https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize\",
      \"AccessTokenURI\": \"https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token\",
      \"ResourceURI\": \"https://graph.microsoft.com/v1.0/me\",
      \"LogoutURI\": \"https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/logout\",
      \"RedirectURI\": \"https://portainer.example.com/\",
      \"UserIdentifier\": \"userPrincipalName\",
      \"Scopes\": \"profile openid\",
      \"AuthStyle\": 1,
      \"OAuthAutoCreateUsers\": true,
      \"SSO\": true
    }
  }"
```

## Step 6: Test SSO

1. Log out of Portainer
2. On the login page, click the Microsoft login button
3. You'll be redirected to Microsoft's login page
4. Authenticate with your Azure AD credentials
5. On first login, Microsoft may ask for consent to the app
6. You should be redirected back to Portainer and logged in

## Restricting Access to Specific Users or Groups

In the Enterprise application for your Portainer app:
1. Go to **Enterprise applications** → find your Portainer app
2. Under **Properties**, set **Assignment required** to Yes
3. Under **Users and groups**, add the users/groups who should have access

This prevents unauthorized Azure AD users from logging into Portainer.

## Conclusion

Azure AD SSO with Portainer provides a seamless login experience for Microsoft 365 organizations. Once configured, users click "Sign in with Microsoft," authenticate once, and gain access to Portainer based on their Portainer role. Combine this with Portainer's team mapping by adding a groups claim in Entra ID and mapping Azure AD group Object IDs in Portainer for automatic access control based on group membership.

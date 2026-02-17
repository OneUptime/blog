# How to Configure OAuth 2.0 Authorization in Azure API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, OAuth 2.0, Authentication, Security, Azure AD

Description: Learn how to configure OAuth 2.0 authorization servers in Azure API Management for secure API access using industry-standard protocols.

---

OAuth 2.0 is the standard protocol for authorization on the modern web. When you combine it with Azure API Management, you get a powerful setup where your gateway handles token validation and your developer portal provides a built-in OAuth flow for testing APIs. In this post, I will walk through the full configuration - registering applications in Azure AD, setting up the authorization server in APIM, and wiring everything together so developers can obtain tokens and call your APIs without friction.

## The OAuth 2.0 Flow in Context

Before diving into configuration, let me clarify what we are building. The flow looks like this:

1. A developer visits your APIM developer portal and wants to test an API.
2. They click "Authorize" and get redirected to Azure AD (or whatever identity provider you use).
3. They sign in and consent to the requested permissions.
4. Azure AD issues an access token and redirects back to the developer portal.
5. The developer portal attaches the token to API requests.
6. APIM validates the token (using the `validate-jwt` policy) and forwards valid requests to the backend.

The authorization server configuration in APIM does not enforce authentication by itself. It enables the OAuth flow in the developer portal. You still need a `validate-jwt` policy to actually reject unauthorized requests.

## Step 1: Register Applications in Azure AD

You need two app registrations in Azure AD: one for your backend API and one for the developer portal (the client).

**Backend API Registration:**

Go to Azure AD, click "App registrations," and create a new registration:
- **Name**: "My API Backend"
- **Supported account types**: Depends on your scenario (single tenant, multi-tenant, etc.)
- **Redirect URI**: Not needed for the backend

After creation, go to "Expose an API" and add an Application ID URI (e.g., `api://my-api-backend`). Then add a scope, like `api://my-api-backend/read`. This scope is what clients will request when obtaining tokens.

**Developer Portal Client Registration:**

Create another registration:
- **Name**: "APIM Developer Portal"
- **Supported account types**: Same as above
- **Redirect URI**: `https://yourinstance.developer.azure-api.net/signin-oauth/code/callback/your-auth-server-name` (Web type)

Go to "Certificates & secrets" and create a client secret. Copy the value immediately - you will not see it again.

Go to "API permissions" and add a permission for your backend API. Select the scope you created (`api://my-api-backend/read`) and grant admin consent if appropriate.

Note down the following values:
- Backend API Application ID URI: `api://my-api-backend`
- Client (portal) Application (client) ID
- Client secret
- Your Azure AD tenant ID

## Step 2: Configure the Authorization Server in APIM

In the Azure Portal, navigate to your APIM instance. Under Security, click "OAuth 2.0" and then "Add."

Fill in the form:

- **Display name**: "Azure AD OAuth"
- **Description**: OAuth 2.0 via Azure AD
- **Client registration page URL**: `https://login.microsoftonline.com/YOUR_TENANT_ID`
- **Authorization grant types**: Check "Authorization code"
- **Authorization endpoint URL**: `https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/authorize`
- **Token endpoint URL**: `https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/token`
- **Default scope**: `api://my-api-backend/read`
- **Client ID**: The Application (client) ID of the developer portal registration
- **Client secret**: The client secret you created

Save the authorization server.

## Step 3: Associate the Authorization Server with Your API

Go to your API in APIM, click on Settings, and under Security, set the "OAuth 2.0" authorization server to the one you just created. This tells the developer portal to show an "Authorize" button when developers view this API.

Save the API settings.

## Step 4: Add JWT Validation Policy

As I mentioned, the authorization server configuration only enables the OAuth flow in the developer portal. To actually enforce authentication, add a `validate-jwt` policy:

```xml
<!-- Validate OAuth 2.0 tokens from Azure AD -->
<!-- This policy enforces that all requests carry a valid Bearer token -->
<inbound>
    <base />
    <validate-jwt
        header-name="Authorization"
        failed-validation-httpcode="401"
        failed-validation-error-message="Access denied. Invalid or missing token."
        require-scheme="Bearer"
        require-expiration-time="true">

        <!-- Azure AD v2.0 OpenID configuration -->
        <openid-config url="https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0/.well-known/openid-configuration" />

        <audiences>
            <audience>api://my-api-backend</audience>
        </audiences>

        <issuers>
            <issuer>https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0</issuer>
        </issuers>

        <!-- Optionally require specific scopes -->
        <required-claims>
            <claim name="scp" match="any">
                <value>read</value>
            </claim>
        </required-claims>
    </validate-jwt>
</inbound>
```

## Step 5: Test from the Developer Portal

Navigate to your developer portal, find the API, and you should see an "Authorization" section with a dropdown showing your OAuth 2.0 server. Click "Authorize," sign in with Azure AD credentials, and consent to the permissions.

Once authorized, the portal will attach the Bearer token to all test requests. Try calling an operation and you should get a successful response.

## Using Client Credentials Flow (Machine-to-Machine)

The authorization code flow above is for interactive users. For service-to-service communication, you need the client credentials flow. The client application requests a token directly from Azure AD using its client ID and secret, without any user interaction.

In Azure AD, the client app needs an "Application permission" (not a "Delegated permission") on the backend API. After granting admin consent, the client can request a token:

```bash
# Obtain a token using the client credentials flow
# This is for machine-to-machine authentication without user interaction
curl -X POST \
    "https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=CLIENT_APP_ID" \
    -d "client_secret=CLIENT_SECRET" \
    -d "scope=api://my-api-backend/.default" \
    -d "grant_type=client_credentials"
```

The response contains an access token that the client includes in its API requests. The `validate-jwt` policy in APIM validates it the same way.

Note that client credentials tokens do not have a `scp` claim. They have a `roles` claim instead. Adjust your `required-claims` accordingly:

```xml
<!-- For client credentials flow, check the 'roles' claim instead of 'scp' -->
<required-claims>
    <claim name="roles" match="any">
        <value>API.ReadWrite</value>
    </claim>
</required-claims>
```

## Handling Token Refresh

Access tokens have a limited lifetime (usually one hour for Azure AD). In the developer portal, APIM handles token refresh automatically if the authorization server is configured with a refresh token grant type.

For programmatic clients, the client application is responsible for refreshing tokens. A typical pattern is to catch 401 responses, request a new token, and retry the request.

## Securing the Authorization Code Flow with PKCE

If your client is a single-page application (SPA) or mobile app that cannot securely store a client secret, use PKCE (Proof Key for Code Exchange). APIM supports this as part of the OAuth 2.0 configuration.

When configuring the authorization server in APIM, you can enable PKCE by selecting "Authorization code" as the grant type and ensuring your client app registration in Azure AD is configured as a public client (no client secret).

The developer portal will automatically generate the code verifier and code challenge as part of the authorization flow.

## Multi-Tenant OAuth Configuration

If your API needs to accept tokens from multiple Azure AD tenants, change the issuer and OpenID configuration to use the "common" endpoint:

```xml
<!-- Accept tokens from any Azure AD tenant -->
<!-- Use this for multi-tenant applications -->
<validate-jwt header-name="Authorization" require-scheme="Bearer">
    <openid-config url="https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration" />
    <audiences>
        <audience>api://my-api-backend</audience>
    </audiences>
    <!-- Do not restrict issuers for multi-tenant -->
</validate-jwt>
```

Be careful with this approach. Without issuer restrictions, any Azure AD tenant can obtain a token for your API. You should add additional validation logic, like checking the `tid` (tenant ID) claim against an allowlist.

## Troubleshooting Common Issues

**"AADSTS700016: Application not found in the directory"** - The client ID or audience does not match an app registration in the tenant. Double-check your Application (client) IDs.

**"AADSTS65001: The user or administrator has not consented"** - The client app needs permission to access the backend API. Grant admin consent in Azure AD.

**Token validation fails with "IDX10214: Audience validation failed"** - The `aud` claim in the token does not match any value in your `audiences` list. Check whether the token uses `api://...` or the raw client ID as the audience.

**The developer portal does not show the Authorize button** - Make sure the API's security settings reference the correct authorization server, and that you have published the developer portal after making changes.

## Summary

Setting up OAuth 2.0 in Azure API Management involves three main pieces: registering applications in your identity provider, configuring the authorization server in APIM, and adding a JWT validation policy. The authorization server enables the developer portal OAuth flow, and the validation policy enforces authentication at the gateway. Together, they give you a standards-based authentication layer that works for both interactive users and machine-to-machine scenarios.

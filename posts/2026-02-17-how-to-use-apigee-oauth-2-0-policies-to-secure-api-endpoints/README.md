# How to Use Apigee OAuth 2.0 Policies to Secure API Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apigee, GCP, OAuth 2.0, API Security, Authentication

Description: A comprehensive guide to implementing OAuth 2.0 authentication in Apigee using built-in policies for client credentials, authorization code, and token validation.

---

API keys are fine for basic identification, but when you need proper authentication and authorization, OAuth 2.0 is the standard. Apigee has built-in OAuth 2.0 policies that handle token generation, validation, and refresh without writing custom code. You can implement client credentials flow for server-to-server communication, authorization code flow for user-facing applications, and token validation for protecting endpoints.

## OAuth 2.0 Flows Supported by Apigee

Apigee supports all standard OAuth 2.0 grant types:

- **Client Credentials** - for server-to-server (machine-to-machine) communication
- **Authorization Code** - for user-facing apps (most secure for end users)
- **Password** (Resource Owner) - for trusted first-party apps
- **Implicit** - for browser-based apps (deprecated in favor of Authorization Code with PKCE)

This guide focuses on the two most common: Client Credentials and Authorization Code.

## Setting Up Client Credentials Flow

Client Credentials is the simplest OAuth flow. The client sends its credentials (client ID and secret) and gets back an access token. No user interaction is needed.

### Step 1 - Create the Token Endpoint Proxy

Create a dedicated proxy for token operations:

```xml
<!-- oauth-proxy/apiproxy/proxies/default.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ProxyEndpoint name="default">
    <PreFlow name="PreFlow">
        <Request/>
        <Response/>
    </PreFlow>

    <Flows>
        <!-- Token generation endpoint -->
        <Flow name="GenerateAccessToken">
            <Condition>(proxy.pathsuffix MatchesPath "/token") and (request.verb = "POST")</Condition>
            <Request>
                <Step>
                    <Name>GenerateAccessToken-CC</Name>
                </Step>
            </Request>
            <Response/>
        </Flow>

        <!-- Token refresh endpoint -->
        <Flow name="RefreshAccessToken">
            <Condition>(proxy.pathsuffix MatchesPath "/refresh") and (request.verb = "POST")</Condition>
            <Request>
                <Step>
                    <Name>RefreshAccessToken</Name>
                </Step>
            </Request>
            <Response/>
        </Flow>

        <!-- Token revocation endpoint -->
        <Flow name="RevokeToken">
            <Condition>(proxy.pathsuffix MatchesPath "/revoke") and (request.verb = "POST")</Condition>
            <Request>
                <Step>
                    <Name>InvalidateAccessToken</Name>
                </Step>
            </Request>
            <Response/>
        </Flow>
    </Flows>

    <PostFlow name="PostFlow">
        <Request/>
        <Response/>
    </PostFlow>

    <HTTPProxyConnection>
        <BasePath>/oauth</BasePath>
    </HTTPProxyConnection>

    <!-- No target needed - this proxy generates tokens directly -->
    <RouteRule name="NoRoute"/>
</ProxyEndpoint>
```

### Step 2 - Create the Token Generation Policy

This policy generates access tokens for the Client Credentials flow:

```xml
<!-- oauth-proxy/apiproxy/policies/GenerateAccessToken-CC.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<OAuthV2 name="GenerateAccessToken-CC">
    <DisplayName>Generate Access Token - Client Credentials</DisplayName>
    <Operation>GenerateAccessToken</Operation>

    <!-- Only allow client_credentials grant type -->
    <SupportedGrantTypes>
        <GrantType>client_credentials</GrantType>
    </SupportedGrantTypes>

    <!-- Token lifetime: 1 hour (3600 seconds) -->
    <ExpiresIn>3600000</ExpiresIn>

    <!-- Generate a refresh token as well -->
    <GenerateResponse enabled="true"/>

    <!-- Where to find the grant type in the request -->
    <GrantType>request.formparam.grant_type</GrantType>
</OAuthV2>
```

### Step 3 - Create the Refresh Token Policy

```xml
<!-- oauth-proxy/apiproxy/policies/RefreshAccessToken.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<OAuthV2 name="RefreshAccessToken">
    <DisplayName>Refresh Access Token</DisplayName>
    <Operation>RefreshAccessToken</Operation>
    <ExpiresIn>3600000</ExpiresIn>
    <GenerateResponse enabled="true"/>
    <RefreshToken>request.formparam.refresh_token</RefreshToken>
    <GrantType>request.formparam.grant_type</GrantType>
</OAuthV2>
```

### Step 4 - Create the Token Revocation Policy

```xml
<!-- oauth-proxy/apiproxy/policies/InvalidateAccessToken.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<OAuthV2 name="InvalidateAccessToken">
    <DisplayName>Invalidate Access Token</DisplayName>
    <Operation>InvalidateToken</Operation>
    <Token type="accesstoken">request.formparam.token</Token>
</OAuthV2>
```

### Testing Client Credentials Flow

Request a token:

```bash
# Encode client credentials as base64 (clientId:clientSecret)
CREDENTIALS=$(echo -n "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" | base64)

# Request an access token
curl -X POST "https://YOUR_APIGEE_HOST/oauth/token" \
  -H "Authorization: Basic $CREDENTIALS" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials"
```

The response includes the access token:

```json
{
  "access_token": "abc123xyz...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def456uvw..."
}
```

## Protecting API Endpoints with Token Validation

Now that clients can get tokens, protect your API endpoints by validating them.

### Create the Token Validation Policy

```xml
<!-- your-api/apiproxy/policies/VerifyAccessToken.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<OAuthV2 name="VerifyAccessToken">
    <DisplayName>Verify Access Token</DisplayName>
    <Operation>VerifyAccessToken</Operation>

    <!-- Where to find the access token in the request -->
    <!-- Standard: Authorization: Bearer <token> -->
    <AccessToken>request.header.Authorization</AccessToken>
</OAuthV2>
```

Attach this to your API proxy's PreFlow:

```xml
<!-- your-api/apiproxy/proxies/default.xml -->
<ProxyEndpoint name="default">
    <PreFlow name="PreFlow">
        <Request>
            <!-- Validate the OAuth token on every request -->
            <Step>
                <Name>VerifyAccessToken</Name>
            </Step>
        </Request>
        <Response/>
    </PreFlow>
    <!-- ... -->
</ProxyEndpoint>
```

### Using the Token to Call the API

```bash
# Call the protected API with the access token
curl "https://YOUR_APIGEE_HOST/api/users" \
  -H "Authorization: Bearer abc123xyz..."
```

## Implementing Authorization Code Flow

For user-facing applications, the Authorization Code flow is more secure because it involves user consent and keeps the client secret off the browser.

### Create the Authorization Endpoint

Add a flow for the authorization step:

```xml
<!-- oauth-proxy/apiproxy/proxies/default.xml - add this flow -->
<Flow name="Authorize">
    <Condition>(proxy.pathsuffix MatchesPath "/authorize") and (request.verb = "GET")</Condition>
    <Request>
        <Step>
            <Name>GenerateAuthorizationCode</Name>
        </Step>
    </Request>
    <Response/>
</Flow>
```

The authorization code generation policy:

```xml
<!-- oauth-proxy/apiproxy/policies/GenerateAuthorizationCode.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<OAuthV2 name="GenerateAuthorizationCode">
    <DisplayName>Generate Authorization Code</DisplayName>
    <Operation>GenerateAuthorizationCode</Operation>

    <ExpiresIn>600000</ExpiresIn> <!-- Auth code valid for 10 minutes -->
    <GenerateResponse enabled="true"/>

    <ResponseType>request.queryparam.response_type</ResponseType>
    <ClientId>request.queryparam.client_id</ClientId>
    <RedirectUri>request.queryparam.redirect_uri</RedirectUri>
    <Scope>request.queryparam.scope</Scope>
    <State>request.queryparam.state</State>
</OAuthV2>
```

Add a token generation policy that supports authorization_code grant:

```xml
<!-- oauth-proxy/apiproxy/policies/GenerateAccessToken-AC.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<OAuthV2 name="GenerateAccessToken-AC">
    <DisplayName>Generate Access Token - Auth Code</DisplayName>
    <Operation>GenerateAccessToken</Operation>

    <SupportedGrantTypes>
        <GrantType>authorization_code</GrantType>
    </SupportedGrantTypes>

    <ExpiresIn>3600000</ExpiresIn>
    <GenerateResponse enabled="true"/>

    <GrantType>request.formparam.grant_type</GrantType>
    <Code>request.formparam.code</Code>
    <RedirectUri>request.formparam.redirect_uri</RedirectUri>
</OAuthV2>
```

## Accessing Token Metadata in Policies

After token verification, Apigee makes token metadata available as flow variables. You can use these for authorization logic.

```xml
<!-- Access token metadata in subsequent policies -->
<!-- Available variables after VerifyAccessToken: -->
<!-- oauthv2accesstoken.VerifyAccessToken.client_id -->
<!-- oauthv2accesstoken.VerifyAccessToken.scope -->
<!-- oauthv2accesstoken.VerifyAccessToken.developer.email -->
<!-- oauthv2accesstoken.VerifyAccessToken.expires_in -->
```

Use these in conditional flows for scope-based access control:

```xml
<!-- Only allow access if the token has the "admin" scope -->
<Flow name="AdminOnly">
    <Condition>(proxy.pathsuffix MatchesPath "/admin/**")</Condition>
    <Request>
        <Step>
            <Name>CheckAdminScope</Name>
            <Condition>NOT (oauthv2accesstoken.VerifyAccessToken.scope ~~ ".*admin.*")</Condition>
        </Step>
    </Request>
</Flow>
```

The scope check policy:

```xml
<!-- apiproxy/policies/CheckAdminScope.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<RaiseFault name="CheckAdminScope">
    <DisplayName>Check Admin Scope</DisplayName>
    <FaultResponse>
        <Set>
            <StatusCode>403</StatusCode>
            <Payload contentType="application/json">
{
    "error": "insufficient_scope",
    "message": "This endpoint requires the 'admin' scope"
}
            </Payload>
        </Set>
    </FaultResponse>
</RaiseFault>
```

## Custom Error Responses for OAuth Errors

Provide meaningful error responses when authentication fails:

```xml
<!-- apiproxy/proxies/default.xml - FaultRules -->
<FaultRules>
    <FaultRule name="InvalidToken">
        <Condition>(fault.name = "InvalidAccessToken") or (fault.name = "access_token_expired")</Condition>
        <Step>
            <Name>InvalidTokenResponse</Name>
        </Step>
    </FaultRule>
</FaultRules>
```

```xml
<!-- apiproxy/policies/InvalidTokenResponse.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<AssignMessage name="InvalidTokenResponse">
    <DisplayName>Invalid Token Response</DisplayName>
    <Set>
        <StatusCode>401</StatusCode>
        <Payload contentType="application/json">
{
    "error": "invalid_token",
    "message": "The access token is invalid or has expired. Please request a new token."
}
        </Payload>
        <Headers>
            <Header name="WWW-Authenticate">Bearer realm="api", error="invalid_token"</Header>
        </Headers>
    </Set>
</AssignMessage>
```

## Summary

Apigee's OAuth 2.0 policies give you a complete token lifecycle without custom code. Use Client Credentials for server-to-server communication and Authorization Code for user-facing apps. The VerifyAccessToken policy on your API proxy endpoints validates tokens and makes metadata available for scope-based authorization. Combine this with custom error responses for a professional OAuth implementation that follows RFC standards. The best part is that token storage, expiration, and cleanup are all handled by Apigee - you just configure the policies.

# How to Validate JWT Tokens in Azure API Management Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, JWT, Authentication, Security, OAuth

Description: Step-by-step guide to validating JWT tokens in Azure API Management policies to secure your APIs at the gateway level.

---

One of the most practical things you can do with Azure API Management is validate JWT tokens before requests reach your backend. This way, invalid or expired tokens get rejected at the gateway, your backend never has to deal with them, and you get a consistent authentication layer across all your APIs regardless of what framework or language they are built with.

APIM has a built-in `validate-jwt` policy that handles the heavy lifting. In this post, I will show you how to configure it for different identity providers, handle common edge cases, and extract claims for downstream use.

## Why Validate at the Gateway

You might wonder why you would validate tokens at the gateway when your backend already does it. There are a few good reasons.

First, it reduces load on your backend. Unauthenticated requests get rejected before they ever hit your service. This matters when you are under attack or dealing with misconfigured clients sending thousands of requests with expired tokens.

Second, it gives you a single place to define authentication requirements. If you have ten microservices behind APIM, you configure JWT validation once in the gateway rather than maintaining token validation logic in ten different codebases.

Third, you can extract claims from the token at the gateway and pass them as headers to your backend. This means your backend receives pre-validated, pre-parsed identity information without needing to decode the JWT itself.

## Basic JWT Validation

The simplest `validate-jwt` policy checks that the token is present, properly signed, and not expired. Here is an example for tokens issued by Azure AD:

```xml
<!-- Validate JWT tokens issued by Azure AD -->
<!-- Rejects requests with missing, expired, or improperly signed tokens -->
<inbound>
    <base />
    <validate-jwt
        header-name="Authorization"
        failed-validation-httpcode="401"
        failed-validation-error-message="Unauthorized. Token is invalid or missing."
        require-expiration-time="true"
        require-scheme="Bearer">

        <!-- The OpenID Connect discovery endpoint for your Azure AD tenant -->
        <openid-config url="https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0/.well-known/openid-configuration" />

        <!-- Only accept tokens intended for your API -->
        <audiences>
            <audience>api://your-api-client-id</audience>
        </audiences>

        <!-- Only accept tokens from your tenant -->
        <issuers>
            <issuer>https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0</issuer>
        </issuers>
    </validate-jwt>
</inbound>
```

Let me break down each piece:

- **header-name**: Which header contains the token. Almost always "Authorization."
- **require-scheme**: Expects the header value to start with "Bearer " and strips it before validation.
- **openid-config**: Points to the OpenID Connect discovery document. APIM fetches the signing keys from this endpoint and caches them. This is the recommended approach because the keys rotate automatically.
- **audiences**: The intended audience of the token. This should match the `aud` claim in the JWT.
- **issuers**: The expected issuer. This should match the `iss` claim in the JWT.

## Validating Tokens from Auth0

If you use Auth0 instead of Azure AD, the configuration is very similar. You just point to Auth0's discovery endpoint:

```xml
<!-- Validate JWT tokens issued by Auth0 -->
<!-- Replace YOUR_AUTH0_DOMAIN with your actual Auth0 tenant domain -->
<inbound>
    <base />
    <validate-jwt
        header-name="Authorization"
        failed-validation-httpcode="401"
        failed-validation-error-message="Invalid token"
        require-scheme="Bearer">

        <openid-config url="https://YOUR_AUTH0_DOMAIN/.well-known/openid-configuration" />

        <audiences>
            <audience>https://your-api-identifier</audience>
        </audiences>
    </validate-jwt>
</inbound>
```

The beauty of using the `openid-config` URL is that APIM automatically fetches the signing keys, so you do not have to hardcode them.

## Requiring Specific Claims

Sometimes a valid token is not enough. You might need the user to have a specific role or scope. The `validate-jwt` policy supports claim checks:

```xml
<!-- Validate JWT and require specific claims -->
<!-- The user must have either the 'admin' or 'editor' role -->
<validate-jwt header-name="Authorization" require-scheme="Bearer">
    <openid-config url="https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0/.well-known/openid-configuration" />
    <audiences>
        <audience>api://your-api-client-id</audience>
    </audiences>
    <required-claims>
        <!-- Require the 'roles' claim to contain at least one of these values -->
        <claim name="roles" match="any">
            <value>admin</value>
            <value>editor</value>
        </claim>
        <!-- Require the 'scp' (scope) claim to contain 'read' -->
        <claim name="scp" match="all">
            <value>read</value>
        </claim>
    </required-claims>
</validate-jwt>
```

The `match` attribute controls whether the claim must contain all of the listed values (`all`) or at least one (`any`).

## Extracting Claims for Backend Use

After validating the token, you often want to pass claim values to your backend as headers. This avoids the backend having to decode the JWT again.

```xml
<!-- Validate JWT and store the decoded token in a variable -->
<validate-jwt
    header-name="Authorization"
    require-scheme="Bearer"
    output-token-variable-name="jwt">
    <openid-config url="https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0/.well-known/openid-configuration" />
    <audiences>
        <audience>api://your-api-client-id</audience>
    </audiences>
</validate-jwt>

<!-- Extract claims from the validated token and pass them as headers -->
<set-header name="X-User-Id" exists-action="override">
    <value>@(((Jwt)context.Variables["jwt"]).Claims["oid"]?.FirstOrDefault() ?? "unknown")</value>
</set-header>
<set-header name="X-User-Email" exists-action="override">
    <value>@(((Jwt)context.Variables["jwt"]).Claims["email"]?.FirstOrDefault() ?? "unknown")</value>
</set-header>
<set-header name="X-User-Name" exists-action="override">
    <value>@(((Jwt)context.Variables["jwt"]).Claims["name"]?.FirstOrDefault() ?? "unknown")</value>
</set-header>
```

The `output-token-variable-name` attribute stores the decoded JWT in a context variable that you can reference in subsequent policy expressions. This is extremely useful for injecting user identity into your backend requests.

## Handling Multiple Token Issuers

If your API accepts tokens from multiple identity providers (for example, Azure AD for internal users and a B2C tenant for external users), you can use multiple `validate-jwt` policies with a `choose` block:

```xml
<!-- Handle tokens from two different issuers -->
<inbound>
    <base />
    <choose>
        <!-- Try Azure AD first -->
        <when condition="@(context.Request.Headers.GetValueOrDefault("Authorization","").Contains("v2.0"))">
            <validate-jwt header-name="Authorization" require-scheme="Bearer">
                <openid-config url="https://login.microsoftonline.com/TENANT_A/v2.0/.well-known/openid-configuration" />
                <audiences>
                    <audience>api://client-a</audience>
                </audiences>
            </validate-jwt>
        </when>
        <otherwise>
            <validate-jwt header-name="Authorization" require-scheme="Bearer">
                <openid-config url="https://YOUR_B2C_TENANT.b2clogin.com/YOUR_B2C_TENANT.onmicrosoft.com/v2.0/.well-known/openid-configuration?p=B2C_1_signupsignin" />
                <audiences>
                    <audience>api://client-b</audience>
                </audiences>
            </validate-jwt>
        </otherwise>
    </choose>
</inbound>
```

A cleaner approach is to inspect the `iss` claim without fully validating, then route to the appropriate validator. But for most cases, two separate validation blocks with a condition work fine.

## Using Signing Keys Directly

If your identity provider does not support OpenID Connect discovery, you can specify signing keys directly. This is less common but sometimes necessary for custom token issuers:

```xml
<!-- Validate JWT using an explicit HMAC signing key -->
<!-- Use this only when OpenID Connect discovery is not available -->
<validate-jwt header-name="Authorization" require-scheme="Bearer">
    <issuer-signing-keys>
        <key>Base64EncodedSigningKeyHere</key>
    </issuer-signing-keys>
    <audiences>
        <audience>your-audience</audience>
    </audiences>
    <issuers>
        <issuer>your-custom-issuer</issuer>
    </issuers>
</validate-jwt>
```

The downside is that you have to manually update the key when it rotates. Always prefer the `openid-config` approach when possible.

## Debugging Token Validation Failures

When token validation fails, the error message APIM returns to the client is intentionally vague for security reasons. But you can get more details by enabling tracing.

In the Azure Portal, go to the Test tab for your API, enable "Ocp-Apim-Trace" by checking the trace box, and send a request with the problematic token. The trace output will show exactly why validation failed - whether it is a signature mismatch, an expired token, a wrong audience, or a missing required claim.

You can also add diagnostic logging to capture validation errors:

```xml
<!-- Log JWT validation failures to Application Insights -->
<on-error>
    <base />
    <choose>
        <when condition="@(context.Response.StatusCode == 401)">
            <trace source="jwt-validation" severity="warning">
                <message>@($"JWT validation failed: {context.LastError.Message}")</message>
            </trace>
        </when>
    </choose>
</on-error>
```

## Performance Considerations

The `validate-jwt` policy is fast because APIM caches the signing keys from the OpenID Connect discovery endpoint. It does not make an outbound call for every request. The keys are refreshed periodically (typically every few hours).

However, if your token includes a `nonce` or you are doing additional claim lookups against an external service, that adds latency. Keep your validation logic at the gateway simple and leave complex authorization decisions to your backend.

## Summary

JWT validation in APIM is one of those features that delivers a lot of value with relatively little configuration. Point it at your identity provider's discovery endpoint, specify your audience and issuer, and you have a solid authentication gate in front of all your APIs. Extract claims into headers for your backend, add required-claims checks for basic authorization, and use the tracing tools when things go wrong. It is a clean separation of concerns that makes both your gateway and your backend simpler.

# How to Implement CORS Policies in Azure API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, CORS, Security, Web Development, API Gateway

Description: A complete guide to configuring CORS (Cross-Origin Resource Sharing) policies in Azure API Management for browser-based API consumers.

---

If your API is consumed by browser-based applications (single-page apps, web widgets, or any JavaScript running in a browser), you need CORS headers. Without them, browsers block cross-origin requests, and your API consumers get cryptic errors in their console. Azure API Management provides a built-in `cors` policy that handles all the CORS header negotiation, including preflight OPTIONS requests.

In this post, I will explain how CORS works, why the gateway is the right place to handle it, and walk through configurations for common scenarios.

## Quick CORS Refresher

CORS (Cross-Origin Resource Sharing) is a browser security mechanism. When JavaScript on `https://app.example.com` tries to call an API at `https://api.example.com`, the browser checks whether the API allows cross-origin requests from that domain.

For simple requests (GET with standard headers), the browser sends the request and checks the `Access-Control-Allow-Origin` header on the response. If the header is missing or does not match the request's origin, the browser blocks the response.

For complex requests (POST with JSON body, custom headers, etc.), the browser first sends a preflight OPTIONS request asking the API what is allowed. Only if the OPTIONS response includes the right CORS headers does the browser proceed with the actual request.

The headers involved are:
- `Access-Control-Allow-Origin`: Which origins can access the API
- `Access-Control-Allow-Methods`: Which HTTP methods are allowed
- `Access-Control-Allow-Headers`: Which custom headers can be sent
- `Access-Control-Expose-Headers`: Which headers the browser can read from the response
- `Access-Control-Max-Age`: How long to cache the preflight response
- `Access-Control-Allow-Credentials`: Whether cookies and auth headers are allowed

## Why Handle CORS at the Gateway

You could handle CORS in your backend code, but there are good reasons to do it at the APIM gateway instead:

1. **Consistency**: All APIs get the same CORS configuration without each backend team implementing it separately.
2. **Preflight efficiency**: OPTIONS preflight requests never reach your backend. APIM handles them directly and returns immediately.
3. **Centralized control**: Security teams can manage allowed origins in one place.
4. **Backend simplicity**: Your backend code does not need any CORS middleware or headers.

## Basic CORS Configuration

The simplest CORS policy allows specific origins and common HTTP methods:

```xml
<!-- Basic CORS policy allowing specific origins -->
<!-- Place this at the "All APIs" level to apply to every API -->
<inbound>
    <base />
    <cors allow-credentials="false">
        <!-- Allowed origins - list each domain that should have access -->
        <allowed-origins>
            <origin>https://app.example.com</origin>
            <origin>https://staging.example.com</origin>
        </allowed-origins>
        <!-- Allowed HTTP methods -->
        <allowed-methods>
            <method>GET</method>
            <method>POST</method>
            <method>PUT</method>
            <method>DELETE</method>
            <method>PATCH</method>
        </allowed-methods>
        <!-- Headers that the client is allowed to send -->
        <allowed-headers>
            <header>Content-Type</header>
            <header>Authorization</header>
            <header>Ocp-Apim-Subscription-Key</header>
        </allowed-headers>
    </cors>
</inbound>
```

This policy does two things:
1. For preflight OPTIONS requests, it returns the CORS headers immediately without hitting the backend.
2. For actual requests, it adds the `Access-Control-Allow-Origin` header to the response.

## Allowing All Origins (Development Only)

During development, you might want to allow any origin. Use the wildcard:

```xml
<!-- Allow all origins - ONLY for development environments -->
<!-- Do NOT use this in production as it allows any website to call your API -->
<cors allow-credentials="false">
    <allowed-origins>
        <origin>*</origin>
    </allowed-origins>
    <allowed-methods preflight-result-max-age="300">
        <method>*</method>
    </allowed-methods>
    <allowed-headers>
        <header>*</header>
    </allowed-headers>
</cors>
```

Never use wildcard origins in production. It means any website on the internet can make cross-origin requests to your API from a user's browser, which opens the door to CSRF-style attacks.

Also note that you cannot use wildcard origins (`*`) when `allow-credentials` is `true`. The CORS specification explicitly forbids this combination.

## Handling Credentials (Cookies and Auth Headers)

If your API needs to receive cookies or the Authorization header from the browser, set `allow-credentials` to `true`:

```xml
<!-- CORS with credentials support for cookie-based authentication -->
<!-- Requires explicit origins - wildcards are not allowed with credentials -->
<cors allow-credentials="true">
    <allowed-origins>
        <origin>https://app.example.com</origin>
    </allowed-origins>
    <allowed-methods>
        <method>GET</method>
        <method>POST</method>
    </allowed-methods>
    <allowed-headers>
        <header>Content-Type</header>
        <header>Authorization</header>
    </allowed-headers>
</cors>
```

When `allow-credentials` is true, the browser sends cookies and authentication headers with cross-origin requests. This is needed for APIs that use cookie-based session authentication, but it also increases the security surface. Only enable it if you actually need it.

## Exposing Custom Response Headers

By default, browsers only expose a small set of "safe" response headers to JavaScript (Cache-Control, Content-Language, Content-Type, Expires, Last-Modified, Pragma). If your API returns custom headers that the client needs to read, expose them explicitly:

```xml
<!-- Expose custom headers so the browser can read them in JavaScript -->
<cors allow-credentials="false">
    <allowed-origins>
        <origin>https://app.example.com</origin>
    </allowed-origins>
    <allowed-methods>
        <method>GET</method>
        <method>POST</method>
    </allowed-methods>
    <allowed-headers>
        <header>Content-Type</header>
        <header>Authorization</header>
    </allowed-headers>
    <!-- These headers are readable by client-side JavaScript -->
    <expose-headers>
        <header>X-Request-Id</header>
        <header>X-RateLimit-Remaining</header>
        <header>X-Total-Count</header>
    </expose-headers>
</cors>
```

Without the `expose-headers` list, JavaScript code running in the browser cannot read `X-Request-Id` from the response, even though the header is present in the HTTP response.

## Caching Preflight Responses

Every complex cross-origin request triggers a preflight OPTIONS request. This doubles the number of HTTP calls. The `preflight-result-max-age` attribute tells the browser how long to cache the preflight result:

```xml
<!-- Cache preflight responses for 10 minutes to reduce OPTIONS requests -->
<cors allow-credentials="false">
    <allowed-origins>
        <origin>https://app.example.com</origin>
    </allowed-origins>
    <allowed-methods preflight-result-max-age="600">
        <method>GET</method>
        <method>POST</method>
        <method>PUT</method>
        <method>DELETE</method>
    </allowed-methods>
    <allowed-headers>
        <header>Content-Type</header>
        <header>Authorization</header>
    </allowed-headers>
</cors>
```

A value of 600 seconds (10 minutes) is reasonable for most APIs. The browser caches the preflight response and skips the OPTIONS request for subsequent calls within that window.

## Per-API CORS Configuration

You can apply different CORS policies to different APIs. Maybe your public API allows many origins, while an internal API only allows your company's domains.

At the "All APIs" level, set a restrictive default:

```xml
<!-- Default CORS policy at the "All APIs" level -->
<cors allow-credentials="false">
    <allowed-origins>
        <origin>https://internal.company.com</origin>
    </allowed-origins>
    <allowed-methods>
        <method>GET</method>
    </allowed-methods>
    <allowed-headers>
        <header>Content-Type</header>
    </allowed-headers>
</cors>
```

Then override it at the individual API level for your public API:

```xml
<!-- More permissive CORS for the public-facing API -->
<cors allow-credentials="false">
    <allowed-origins>
        <origin>https://partner-a.com</origin>
        <origin>https://partner-b.com</origin>
        <origin>https://partner-c.com</origin>
    </allowed-origins>
    <allowed-methods preflight-result-max-age="600">
        <method>GET</method>
        <method>POST</method>
    </allowed-methods>
    <allowed-headers>
        <header>Content-Type</header>
        <header>Authorization</header>
        <header>X-Api-Key</header>
    </allowed-headers>
</cors>
```

## Dynamic Origin Validation

If you have many allowed origins or the list changes frequently, you can use a policy expression to validate the origin dynamically:

```xml
<!-- Dynamic CORS: validate origin against a pattern -->
<!-- Allows any subdomain of example.com -->
<inbound>
    <base />
    <choose>
        <when condition="@{
            var origin = context.Request.Headers.GetValueOrDefault("Origin", "");
            return origin.EndsWith(".example.com") || origin == "https://example.com";
        }">
            <set-header name="Access-Control-Allow-Origin" exists-action="override">
                <value>@(context.Request.Headers.GetValueOrDefault("Origin", ""))</value>
            </set-header>
            <set-header name="Access-Control-Allow-Methods" exists-action="override">
                <value>GET, POST, PUT, DELETE</value>
            </set-header>
            <set-header name="Access-Control-Allow-Headers" exists-action="override">
                <value>Content-Type, Authorization</value>
            </set-header>
        </when>
    </choose>
</inbound>
```

This is more flexible than the static `cors` policy but requires more manual handling of preflight requests.

## Troubleshooting CORS Issues

When CORS is not working, the browser console shows errors like "No 'Access-Control-Allow-Origin' header is present on the requested resource." Here is how to debug:

1. **Check the request Origin header**: Open browser DevTools, go to the Network tab, and look at the failed request. Check the `Origin` header value. Is it in your allowed origins list?

2. **Check the preflight response**: Look for an OPTIONS request to the same URL. Check its response headers. Are the CORS headers present?

3. **Use APIM tracing**: Enable tracing in the APIM test console and send a request with an Origin header. The trace will show whether the CORS policy is being hit.

4. **Check policy scope**: Make sure the CORS policy is at the right scope. If it is on a specific operation, it does not apply to other operations.

5. **Check for conflicting headers**: If your backend also sends CORS headers, they might conflict with APIM's headers. Either remove CORS handling from the backend or from APIM, but not both.

## Summary

CORS in Azure API Management is straightforward with the built-in `cors` policy. List your allowed origins, methods, and headers, set a reasonable preflight cache duration, and apply the policy at the appropriate scope. Handle it at the gateway so your backends stay clean, and never use wildcard origins in production. If your origin list is dynamic, fall back to a policy expression that validates origins programmatically. Test from a real browser, because CORS is enforced by the browser, not by curl or Postman.

# How to Fix CORS Errors in Azure API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, CORS, Troubleshooting, REST API, Web Development, Security

Description: A practical guide to fixing Cross-Origin Resource Sharing (CORS) errors in Azure API Management with policy configurations and debugging tips.

---

CORS errors are the bane of every frontend developer's existence, and when you throw Azure API Management (APIM) into the mix, they can get even more confusing. The browser blocks the response, the error message is cryptic, and you are left wondering whether the problem is in APIM, your backend, or both.

In this post, I will explain how CORS works in the context of APIM, the most common mistakes that cause CORS failures, and exactly how to configure the CORS policy to fix them.

## A Quick Refresher on How CORS Works

When a browser makes a request to a different origin (different protocol, domain, or port), it enforces the Same-Origin Policy. The server must include specific headers in its response to tell the browser "yes, this origin is allowed to access my resources."

For simple requests (GET, POST with certain content types), the browser sends the request directly and checks the `Access-Control-Allow-Origin` header in the response.

For more complex requests (PUT, DELETE, custom headers, JSON content type), the browser first sends a preflight OPTIONS request. The server must respond to this OPTIONS request with the appropriate CORS headers. Only then does the browser send the actual request.

This preflight mechanism is where most CORS failures happen in APIM.

## The Problem: APIM Does Not Handle CORS by Default

Out of the box, Azure API Management does not add CORS headers to responses. If your frontend JavaScript calls an API through APIM, and the browser sends a preflight OPTIONS request, APIM will return a 405 Method Not Allowed (because there is no operation defined for OPTIONS) or pass the OPTIONS request to the backend, which might not handle it either.

The result is a browser console error like:

```
Access to XMLHttpRequest at 'https://myapi.azure-api.net/users' from origin 'https://myapp.com'
has been blocked by CORS policy: Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution: Add the CORS Policy in APIM

APIM has a built-in `cors` policy that handles preflight requests and adds the necessary headers. Here is how to configure it properly.

### Basic CORS Policy

Add this to the `<inbound>` section of your API policy. You can set it at the global level (All APIs), the API level, or the operation level.

```xml
<!-- CORS policy - handles preflight OPTIONS requests and adds required headers -->
<!-- Place this in the <inbound> section of your policy -->
<cors allow-credentials="true">
    <!-- Specify the exact origins that should be allowed -->
    <allowed-origins>
        <origin>https://myapp.com</origin>
        <origin>https://staging.myapp.com</origin>
    </allowed-origins>
    <!-- HTTP methods your API supports -->
    <allowed-methods preflight-result-max-age="300">
        <method>GET</method>
        <method>POST</method>
        <method>PUT</method>
        <method>DELETE</method>
        <method>PATCH</method>
        <method>OPTIONS</method>
    </allowed-methods>
    <!-- Headers the client is allowed to send -->
    <allowed-headers>
        <header>Content-Type</header>
        <header>Authorization</header>
        <header>X-Requested-With</header>
    </allowed-headers>
    <!-- Headers the client is allowed to read from the response -->
    <expose-headers>
        <header>X-Total-Count</header>
        <header>X-Page-Size</header>
    </expose-headers>
</cors>
```

### Where to Place the Policy

The placement matters. If you put the CORS policy at the operation level, it only applies to that specific operation. The preflight OPTIONS request might hit a different operation or no operation at all, and the CORS policy will not fire.

My recommendation: always put the CORS policy at the **All APIs** level or at least the individual API level. This ensures it applies to all requests, including preflight requests.

To set it at the All APIs level through the portal:

1. Go to your APIM instance
2. Click **APIs** in the left menu
3. Click **All APIs**
4. Click the **Inbound processing** policy editor
5. Add the `<cors>` element inside `<inbound>`

## Common Mistakes and How to Fix Them

### Mistake 1: Using Wildcard Origin with Credentials

If your API requires authentication (cookies, Authorization header), you cannot use a wildcard (`*`) for allowed origins. The browser will reject it.

```xml
<!-- This WILL NOT WORK when allow-credentials is true -->
<cors allow-credentials="true">
    <allowed-origins>
        <origin>*</origin>  <!-- Browser rejects wildcard with credentials -->
    </allowed-origins>
</cors>

<!-- This WILL work - list explicit origins -->
<cors allow-credentials="true">
    <allowed-origins>
        <origin>https://myapp.com</origin>
    </allowed-origins>
</cors>
```

### Mistake 2: Missing Headers in allowed-headers

If your frontend sends a custom header that is not listed in `allowed-headers`, the preflight will fail. The most common one I see missing is `Content-Type` when set to `application/json`.

The browser considers `Content-Type: application/json` a non-simple header, so it triggers a preflight. If `Content-Type` is not in your allowed-headers list, the preflight response will not include it, and the browser blocks the actual request.

```xml
<!-- Make sure to include all headers your frontend actually sends -->
<allowed-headers>
    <header>Content-Type</header>
    <header>Authorization</header>
    <header>Accept</header>
    <header>X-Requested-With</header>
    <header>Ocp-Apim-Subscription-Key</header>  <!-- APIM subscription key header -->
</allowed-headers>
```

### Mistake 3: Backend Also Sending CORS Headers

If your backend API also adds CORS headers and the APIM CORS policy adds them too, you end up with duplicate headers. The browser sees something like:

```
Access-Control-Allow-Origin: https://myapp.com, https://myapp.com
```

This is invalid and the browser rejects it. You need to pick one place to handle CORS - either APIM or the backend, not both.

If you want APIM to handle CORS (recommended), tell your backend to stop adding CORS headers. Or use the `terminate-unmatched-request` attribute to have APIM handle preflight entirely without forwarding to the backend:

```xml
<!-- terminate-unmatched-request ensures APIM handles preflight directly -->
<!-- without forwarding the OPTIONS request to the backend -->
<cors allow-credentials="true" terminate-unmatched-request="true">
    <allowed-origins>
        <origin>https://myapp.com</origin>
    </allowed-origins>
    <allowed-methods preflight-result-max-age="300">
        <method>GET</method>
        <method>POST</method>
        <method>PUT</method>
        <method>DELETE</method>
    </allowed-methods>
    <allowed-headers>
        <header>*</header>
    </allowed-headers>
</cors>
```

### Mistake 4: Not Handling the OPTIONS Method

Some APIM configurations have operations explicitly defined for GET, POST, PUT, etc. but not OPTIONS. When the browser sends a preflight OPTIONS request, APIM cannot match it to an operation and returns a 404 or 405.

The `cors` policy with `terminate-unmatched-request="true"` handles this by intercepting the OPTIONS request before routing. But if you are not using that attribute, you might need to add an OPTIONS operation to your API or use a wildcard operation.

### Mistake 5: Policy Scope Issues

If you define the CORS policy at the operation level on a GET operation, the preflight OPTIONS request will not match that operation. The CORS policy never fires, and the preflight fails.

Always define CORS at the API level or higher.

## Debugging CORS Issues

### Use Browser Developer Tools

Open the Network tab in your browser's developer tools. Look for the OPTIONS request that precedes your actual API call. Check:

- Does it return a 200 status? If not, APIM is not handling the preflight.
- Does it include `Access-Control-Allow-Origin` in the response headers?
- Does `Access-Control-Allow-Methods` include the method you need?
- Does `Access-Control-Allow-Headers` include all headers your request sends?

### Use APIM Tracing

APIM has a built-in tracing feature that shows you exactly how policies are evaluated. Enable tracing by adding the `Ocp-Apim-Trace: true` header along with your subscription key.

```bash
# Send a request with tracing enabled
# The trace URL will be in the Ocp-Apim-Trace-Location response header
curl -v -X OPTIONS \
  -H "Origin: https://myapp.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  -H "Ocp-Apim-Subscription-Key: your-subscription-key" \
  -H "Ocp-Apim-Trace: true" \
  https://myapi.azure-api.net/users
```

The trace output shows you whether the CORS policy was triggered, what headers it added, and if it terminated the request or forwarded it to the backend.

### Test Preflight Manually with curl

You can simulate a preflight request from the command line to test without a browser:

```bash
# Simulate a browser preflight request
# The response should include Access-Control-Allow-Origin and related headers
curl -v -X OPTIONS \
  -H "Origin: https://myapp.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://myapi.azure-api.net/users
```

If the response includes the correct CORS headers, your policy is working. If not, double-check the policy placement and configuration.

## A Complete Working Example

Here is a full APIM policy that handles CORS correctly for a typical single-page application:

```xml
<policies>
    <inbound>
        <base />
        <!-- CORS policy for SPA frontend -->
        <cors allow-credentials="true" terminate-unmatched-request="true">
            <allowed-origins>
                <origin>https://myapp.com</origin>
                <origin>https://staging.myapp.com</origin>
                <origin>http://localhost:3000</origin>
            </allowed-origins>
            <allowed-methods preflight-result-max-age="600">
                <method>GET</method>
                <method>POST</method>
                <method>PUT</method>
                <method>DELETE</method>
                <method>PATCH</method>
            </allowed-methods>
            <allowed-headers>
                <header>*</header>
            </allowed-headers>
            <expose-headers>
                <header>*</header>
            </expose-headers>
        </cors>
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
```

## Summary

CORS errors in Azure API Management come down to three things: making sure the CORS policy exists, making sure it is at the right scope, and making sure the configuration matches what the browser expects. Use `terminate-unmatched-request="true"` to have APIM handle preflight requests directly. Do not let both APIM and your backend add CORS headers. And always test with browser dev tools and curl to verify the headers are correct before assuming the problem is elsewhere.

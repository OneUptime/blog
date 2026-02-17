# How to Configure Azure Application Gateway with Rewrite Rules for HTTP Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Application Gateway, HTTP Headers, Rewrite Rules, Load Balancing, Security

Description: Configure Azure Application Gateway rewrite rules to modify HTTP request and response headers for security, routing, and application compatibility.

---

Azure Application Gateway sits between your clients and your backend servers, which makes it the perfect place to modify HTTP headers. Whether you need to add security headers, strip internal headers before they reach clients, inject routing information, or fix headers that your backend sends incorrectly, rewrite rules handle it all without touching your application code.

This guide covers how to configure header rewrite rules on Application Gateway v2, with practical examples for the most common scenarios.

## What Rewrite Rules Can Do

Rewrite rules on Application Gateway can modify three things:

- **Request headers**: Modify headers in the request before it reaches the backend
- **Response headers**: Modify headers in the response before it reaches the client
- **URL path and query string**: Rewrite the URL path or query parameters

For each rule, you can set conditions that determine when the rule applies (based on request headers, server variables, or response headers) and define actions that add, modify, or delete headers.

## Prerequisites

- Azure Application Gateway v2 (Standard_v2 or WAF_v2 SKU)
- At least one routing rule configured
- Azure CLI installed
- Familiarity with HTTP headers and their purpose

## Step 1: Add Security Headers to All Responses

One of the most common rewrite rule use cases is adding security headers that your backend does not include. Here is how to add the essential security headers:

```bash
# Create a rewrite rule set
az network application-gateway rewrite-rule set create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --name SecurityHeaders

# Add the Strict-Transport-Security header
az network application-gateway rewrite-rule create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --rule-set-name SecurityHeaders \
  --name AddHSTS \
  --sequence 100 \
  --response-headers "Strict-Transport-Security=max-age=31536000; includeSubDomains"

# Add X-Content-Type-Options header
az network application-gateway rewrite-rule create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --rule-set-name SecurityHeaders \
  --name AddXContentTypeOptions \
  --sequence 101 \
  --response-headers "X-Content-Type-Options=nosniff"

# Add X-Frame-Options header
az network application-gateway rewrite-rule create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --rule-set-name SecurityHeaders \
  --name AddXFrameOptions \
  --sequence 102 \
  --response-headers "X-Frame-Options=DENY"

# Add Content-Security-Policy header
az network application-gateway rewrite-rule create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --rule-set-name SecurityHeaders \
  --name AddCSP \
  --sequence 103 \
  --response-headers "Content-Security-Policy=default-src 'self'"

# Add Referrer-Policy header
az network application-gateway rewrite-rule create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --rule-set-name SecurityHeaders \
  --name AddReferrerPolicy \
  --sequence 104 \
  --response-headers "Referrer-Policy=strict-origin-when-cross-origin"
```

## Step 2: Strip Internal Headers from Responses

Backend servers often include headers that expose internal information - server versions, framework details, or internal routing metadata. Remove them before the response reaches the client:

```bash
# Remove the Server header that exposes backend technology
az network application-gateway rewrite-rule create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --rule-set-name SecurityHeaders \
  --name RemoveServerHeader \
  --sequence 200 \
  --response-headers "Server="

# Remove X-Powered-By header
az network application-gateway rewrite-rule create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --rule-set-name SecurityHeaders \
  --name RemoveXPoweredBy \
  --sequence 201 \
  --response-headers "X-Powered-By="

# Remove X-AspNet-Version header
az network application-gateway rewrite-rule create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --rule-set-name SecurityHeaders \
  --name RemoveAspNetVersion \
  --sequence 202 \
  --response-headers "X-AspNet-Version="
```

Setting a header value to empty string effectively removes it from the response.

## Step 3: Forward Client IP to Backend Servers

When traffic passes through Application Gateway, the backend sees the gateway's IP as the source. To preserve the original client IP, forward it in a custom header:

```bash
# Add X-Forwarded-For with the client's actual IP
# Uses the server variable that contains the client IP
az network application-gateway rewrite-rule create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --rule-set-name SecurityHeaders \
  --name AddClientIP \
  --sequence 300 \
  --request-headers "X-Real-IP={var_client_ip}"
```

Application Gateway automatically adds X-Forwarded-For, but if your backend expects a specific header name (like X-Real-IP), you can create a custom mapping using server variables.

Common server variables you can use:

| Variable | Description |
|----------|-------------|
| `{var_client_ip}` | Client IP address |
| `{var_client_port}` | Client port |
| `{var_host}` | Host header from the request |
| `{var_request_uri}` | Full request URI including query string |
| `{var_uri_path}` | Request URI path only |
| `{var_query_string}` | Query string from the request |
| `{http_req_headerName}` | Value of any request header |
| `{http_resp_headerName}` | Value of any response header |

## Step 4: Conditional Rewrite Rules

Sometimes you want to apply rewrite rules only when certain conditions are met. For example, add CORS headers only for specific origins:

```bash
# Add CORS headers conditionally based on the Origin header
az network application-gateway rewrite-rule create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --rule-set-name SecurityHeaders \
  --name AddCORSHeaders \
  --sequence 400 \
  --response-headers "Access-Control-Allow-Origin={http_req_Origin}" \
                     "Access-Control-Allow-Methods=GET, POST, OPTIONS" \
                     "Access-Control-Allow-Headers=Content-Type, Authorization" \
  --conditions "http_req_Origin" ".*\\.myapp\\.com$" false
```

The condition checks if the Origin header matches the pattern. If it does, the rewrite rule fires and adds the CORS headers with the actual origin value.

## Step 5: URL Rewriting

Besides headers, you can rewrite the URL path and query string. This is useful for redirecting old paths, simplifying URLs, or adding routing parameters:

```bash
# Rewrite /api/v1/* to /api/v2/* (API version migration)
az network application-gateway rewrite-rule create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --rule-set-name SecurityHeaders \
  --name RewriteAPIv1 \
  --sequence 500 \
  --modified-path "/api/v2{var_uri_path_1}" \
  --conditions "var_uri_path" "/api/v1/(.*)" false
```

The `{var_uri_path_1}` captures the part of the path after `/api/v1/` and appends it to the new path prefix.

## Step 6: Associate the Rewrite Rule Set with a Routing Rule

Rewrite rule sets must be associated with a routing rule to take effect:

```bash
# Associate the rewrite rule set with a routing rule
az network application-gateway rule update \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --name myRoutingRule \
  --rewrite-rule-set SecurityHeaders
```

You can associate different rewrite rule sets with different routing rules, which lets you apply different header modifications to different paths or domains.

## Step 7: Test the Rewrite Rules

Verify your rewrite rules are working by checking the response headers:

```bash
# Use curl to check response headers
curl -I https://myapp.example.com/page

# Expected output should include the security headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: default-src 'self'
# Referrer-Policy: strict-origin-when-cross-origin
# (Server header should be absent)
# (X-Powered-By header should be absent)
```

For request header verification, check your backend server's access logs to confirm the modified headers are arriving as expected.

## Common Rewrite Scenarios

**Redirect HTTP to HTTPS at the header level**: While Application Gateway has a built-in redirect feature, you can also set a Location header in the rewrite:

```bash
# Add Location header to redirect HTTP to HTTPS
# This uses a condition to match HTTP requests
az network application-gateway rewrite-rule create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --rule-set-name SecurityHeaders \
  --name HTTPToHTTPS \
  --sequence 50 \
  --response-headers "Location=https://{var_host}{var_request_uri}" \
  --conditions "var_request_scheme" "^http$" false
```

**Add cache control headers**: Control how CDNs and browsers cache content:

```bash
# Set Cache-Control for static assets
az network application-gateway rewrite-rule create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --rule-set-name SecurityHeaders \
  --name AddCacheControl \
  --sequence 600 \
  --response-headers "Cache-Control=public, max-age=86400" \
  --conditions "var_uri_path" "\\.(css|js|png|jpg|gif|ico)$" false
```

## Troubleshooting

**Rewrite rules not taking effect**: Verify the rewrite rule set is associated with the correct routing rule. Also check that the rule sequence numbers do not conflict.

**Conditions not matching**: The condition pattern uses regex. Make sure your regex is correct. Test it with a tool like regex101.com before deploying.

**Variable values empty**: Not all server variables are available in all contexts. Request headers are only available in request rewrite rules, and response headers are only available in response rewrite rules.

## Wrapping Up

Header rewrite rules on Azure Application Gateway give you a powerful way to modify HTTP traffic without changing your application code. Use them to add security headers, strip sensitive information, forward client context to backends, and handle URL transformations. The combination of server variables and conditional matching makes the rules flexible enough for most header manipulation needs. Start with the security headers - they are the easiest win and improve your security posture with minimal effort.

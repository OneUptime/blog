# How to Set Up Azure Front Door with Rate Limiting WAF Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Front Door, WAF, Rate Limiting, Security, DDoS, Web Application Firewall

Description: Learn how to configure rate limiting rules in Azure Front Door WAF to protect your web applications from abuse and volumetric attacks.

---

Rate limiting is one of the most effective defenses against brute force attacks, API abuse, and application-layer DDoS. Azure Front Door includes a Web Application Firewall (WAF) that supports custom rate limiting rules, letting you throttle requests based on client IP, request attributes, or geographic location. The nice thing about implementing rate limiting at the Front Door layer is that abusive traffic gets blocked at the edge before it ever reaches your backend servers.

In this guide, we will set up Azure Front Door with WAF rate limiting rules, covering everything from basic IP-based throttling to more sophisticated rules that target specific endpoints.

## How Rate Limiting Works in Azure Front Door WAF

Rate limiting in Azure Front Door WAF evaluates the number of requests from a specific source over a defined time window. When the request count exceeds your threshold, the WAF takes an action - typically blocking further requests from that source for the remainder of the window.

Key concepts:

- **Rate limit threshold**: The maximum number of requests allowed in the time window
- **Rate limit duration**: The time window for counting requests (1 minute or 5 minutes)
- **Group by**: How requests are grouped for counting (typically by client IP, but you can use other variables)
- **Match conditions**: Optional filters that narrow which requests are counted (URL path, headers, query parameters, etc.)

## Prerequisites

- An Azure subscription
- An existing Azure Front Door Standard or Premium profile (rate limiting requires Standard or Premium tier)
- At least one origin group configured in your Front Door
- Azure CLI installed locally

## Step 1: Create a WAF Policy

WAF policies are separate resources that you associate with your Front Door profile. Create one first:

```bash
# Create a WAF policy for Front Door
# The sku must match your Front Door tier
az network front-door waf-policy create \
  --name myWafPolicy \
  --resource-group myResourceGroup \
  --sku Premium_AzureFrontDoor \
  --disabled false
```

## Step 2: Add a Basic Rate Limiting Rule

Start with a simple rule that limits requests per IP address across all endpoints:

```bash
# Create a rate limiting rule that allows 100 requests per minute per IP
# Requests exceeding this limit receive a 429 (Too Many Requests) response
az network front-door waf-policy rule create \
  --name RateLimitPerIP \
  --policy-name myWafPolicy \
  --resource-group myResourceGroup \
  --rule-type RateLimitRule \
  --rate-limit-threshold 100 \
  --rate-limit-duration-in-minutes 1 \
  --action Block \
  --priority 100 \
  --defer
```

This rule counts all requests from each unique client IP and blocks the IP for the remainder of the one-minute window once it exceeds 100 requests.

## Step 3: Add Path-Specific Rate Limiting

Login pages and API endpoints are common targets for brute force attacks. Create a tighter rate limit for sensitive paths:

```bash
# Rate limit login endpoint to 10 requests per minute per IP
az network front-door waf-policy rule create \
  --name RateLimitLogin \
  --policy-name myWafPolicy \
  --resource-group myResourceGroup \
  --rule-type RateLimitRule \
  --rate-limit-threshold 10 \
  --rate-limit-duration-in-minutes 1 \
  --action Block \
  --priority 50 \
  --defer

# Add a match condition to target only the login path
az network front-door waf-policy rule match-condition add \
  --name RateLimitLogin \
  --policy-name myWafPolicy \
  --resource-group myResourceGroup \
  --match-variable RequestUri \
  --operator Contains \
  --values "/login" "/auth" "/signin"
```

For API endpoints, you might want a different threshold:

```bash
# Rate limit API endpoints to 60 requests per minute per IP
az network front-door waf-policy rule create \
  --name RateLimitAPI \
  --policy-name myWafPolicy \
  --resource-group myResourceGroup \
  --rule-type RateLimitRule \
  --rate-limit-threshold 60 \
  --rate-limit-duration-in-minutes 1 \
  --action Block \
  --priority 75 \
  --defer

# Match only requests to the API path
az network front-door waf-policy rule match-condition add \
  --name RateLimitAPI \
  --policy-name myWafPolicy \
  --resource-group myResourceGroup \
  --match-variable RequestUri \
  --operator BeginsWith \
  --values "/api/"
```

## Step 4: Configure Rate Limiting by Geographic Region

If you notice abusive traffic coming disproportionately from certain regions, you can apply stricter rate limits geographically:

```bash
# Apply a stricter rate limit for traffic from specific countries
az network front-door waf-policy rule create \
  --name RateLimitByGeo \
  --policy-name myWafPolicy \
  --resource-group myResourceGroup \
  --rule-type RateLimitRule \
  --rate-limit-threshold 30 \
  --rate-limit-duration-in-minutes 1 \
  --action Block \
  --priority 60 \
  --defer

# Match requests from specific country codes
az network front-door waf-policy rule match-condition add \
  --name RateLimitByGeo \
  --policy-name myWafPolicy \
  --resource-group myResourceGroup \
  --match-variable RemoteAddr \
  --operator GeoMatch \
  --values "CN" "RU"
```

## Step 5: Use Custom Response for Rate-Limited Requests

Instead of sending a generic 403, you can configure a custom response that tells clients they have been rate-limited:

```bash
# Update the WAF policy to use a custom response for blocked requests
az network front-door waf-policy update \
  --name myWafPolicy \
  --resource-group myResourceGroup \
  --custom-block-response-status-code 429 \
  --custom-block-response-body "eyJlcnJvciI6ICJSYXRlIGxpbWl0IGV4Y2VlZGVkLiBQbGVhc2UgdHJ5IGFnYWluIGxhdGVyLiJ9"
```

The body is base64-encoded. The decoded value is:

```json
{"error": "Rate limit exceeded. Please try again later."}
```

This is much more helpful for API consumers than a generic block page.

## Step 6: Associate the WAF Policy with Front Door

Link the WAF policy to your Front Door security policy:

```bash
# Associate the WAF policy with a Front Door endpoint
az afd security-policy create \
  --name mySecurityPolicy \
  --profile-name myFrontDoor \
  --resource-group myResourceGroup \
  --waf-policy "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Network/frontDoorWebApplicationFirewallPolicies/myWafPolicy" \
  --domains "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Cdn/profiles/myFrontDoor/afdEndpoints/myEndpoint"
```

## Step 7: Start in Detection Mode

Before enforcing rate limits in production, run in detection mode first to understand your traffic patterns and validate your thresholds:

```bash
# Set the WAF policy to detection mode
az network front-door waf-policy update \
  --name myWafPolicy \
  --resource-group myResourceGroup \
  --mode Detection
```

In detection mode, the WAF logs which requests would have been blocked without actually blocking them. Review these logs to tune your thresholds.

Once you are confident in your rules, switch to prevention mode:

```bash
# Switch to prevention mode to start enforcing rate limits
az network front-door waf-policy update \
  --name myWafPolicy \
  --resource-group myResourceGroup \
  --mode Prevention
```

## Monitoring Rate Limiting Activity

Set up Azure Monitor to track WAF activity:

```bash
# Enable diagnostic logging for the Front Door WAF
az monitor diagnostic-settings create \
  --name "waf-diagnostics" \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Cdn/profiles/myFrontDoor" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --logs '[
    {"category": "FrontDoorWebApplicationFirewallLog", "enabled": true},
    {"category": "FrontDoorAccessLog", "enabled": true}
  ]'
```

Then query the logs to see which rules are triggering:

```
// KQL query to see rate-limited requests
AzureDiagnostics
| where ResourceType == "PROFILES" and Category == "FrontDoorWebApplicationFirewallLog"
| where action_s == "Block" and ruleName_s contains "RateLimit"
| summarize BlockedRequests = count() by bin(TimeGenerated, 5m), ruleName_s, clientIP_s
| order by BlockedRequests desc
```

## Setting the Right Thresholds

Choosing rate limit thresholds requires understanding your normal traffic patterns. Here are some guidelines:

**For general web traffic**: Start with 200-500 requests per minute per IP. Most legitimate users do not exceed 100 requests per minute even during heavy browsing. Crawlers and bots tend to be much faster.

**For login endpoints**: 5-15 requests per minute per IP is reasonable. No human types their password 15 times per minute.

**For API endpoints**: This depends heavily on your API design. A chatty frontend might make 50-100 API calls per page load. Check your frontend code to understand the baseline.

**For webhook endpoints**: These might receive bursts from third-party services. Set higher thresholds or exclude known webhook sources from rate limiting.

## Common Pitfalls

**Shared IP addresses**: Corporate networks and mobile carriers can have thousands of users behind a single IP. Overly aggressive rate limits will block legitimate users. Consider combining IP-based rate limiting with session-based checks at the application layer.

**CDN caching interactions**: If Front Door is caching responses, cached requests do not hit the WAF. Your actual backend traffic might be lower than the rate limit suggests. Make sure your rate limits account for cache hit rates.

**Health check traffic**: If you have monitoring tools hitting your endpoints, make sure they do not trigger rate limits. Either whitelist their IPs or set thresholds high enough to accommodate health check frequency.

## Wrapping Up

Rate limiting at the Azure Front Door WAF level is a powerful first line of defense. Start with broad rules at generous thresholds, run in detection mode to validate your assumptions, and then gradually tighten limits based on real traffic data. Combine global rate limits with path-specific rules for sensitive endpoints, and always provide meaningful error responses so legitimate clients can understand and adapt when they hit a limit.

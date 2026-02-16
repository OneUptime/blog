# How to Implement Rate Limiting and Throttling in Azure API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, Rate Limiting, Throttling, API Security, Cloud

Description: A practical guide to implementing rate limiting and throttling policies in Azure API Management to protect your backend services.

---

Every API you expose to the outside world needs rate limiting. Without it, a single misbehaving client can saturate your backend, drive up your cloud bill, and degrade the experience for every other consumer. Azure API Management gives you two distinct throttling mechanisms out of the box: `rate-limit` and `rate-limit-by-key`. Understanding the difference between them and knowing when to use each one is essential for running a healthy API platform.

In this guide, I will cover both approaches, show you how to configure them with real policy XML, and walk through the edge cases you need to handle in production.

## Understanding the Two Throttling Policies

APIM offers two throttling policies, and they work differently under the hood.

**rate-limit** (also called `rate-limit` or the fixed-window policy) counts requests per subscription. Every subscription key gets its own counter. When a subscription exceeds the limit, APIM returns a 429 Too Many Requests response without forwarding the request to your backend.

**rate-limit-by-key** lets you define a custom counter key. You can throttle by IP address, by a custom header, by a JWT claim, or by any expression you can extract from the request. This gives you much finer control.

There is also **quota** and **quota-by-key**, which work similarly but enforce limits over longer periods (hours, days, weeks) and track cumulative usage rather than burst rates.

## Setting Up Basic Rate Limiting Per Subscription

The simplest rate limiting policy counts requests per subscription. Here is how to add it.

Go to your API in the Azure Portal, click on "All operations" under the Design tab, and open the policy editor. Add the rate-limit policy in the inbound section:

```xml
<!-- Basic rate limiting: allow 100 calls per 60 seconds per subscription -->
<!-- When the limit is exceeded, APIM returns 429 with a Retry-After header -->
<inbound>
    <base />
    <rate-limit calls="100" renewal-period="60" />
</inbound>
```

This allows 100 requests per 60-second window for each subscription key. The counters are maintained in memory on the APIM gateway nodes. When a subscription hits the limit, it gets a 429 response with a `Retry-After` header indicating how many seconds to wait.

You can also set different limits per product. If you have a "Free" and a "Premium" product, apply different rate-limit policies at the product level rather than the API level.

## Rate Limiting by Custom Key

Subscription-based rate limiting is fine when every consumer has their own subscription. But what if you want to throttle by something else - say, the caller's IP address or a user ID from their JWT token?

That is where `rate-limit-by-key` comes in:

```xml
<!-- Rate limit by the caller's IP address -->
<!-- Each unique IP gets 50 calls per 60 seconds -->
<inbound>
    <base />
    <rate-limit-by-key
        calls="50"
        renewal-period="60"
        counter-key="@(context.Request.IpAddress)" />
</inbound>
```

The `counter-key` is a C# expression that APIM evaluates for each request. You can use any property from the request context. Here are some common patterns:

```xml
<!-- Throttle by a specific header value (e.g., tenant ID) -->
<rate-limit-by-key
    calls="200"
    renewal-period="60"
    counter-key="@(context.Request.Headers.GetValueOrDefault("X-Tenant-Id", "anonymous"))" />

<!-- Throttle by a JWT claim (user's email) -->
<rate-limit-by-key
    calls="30"
    renewal-period="60"
    counter-key="@(context.Request.Headers.GetValueOrDefault("Authorization", "").AsJwt()?.Claims["email"]?.FirstOrDefault() ?? "unknown")" />
```

## Combining Rate Limits and Quotas

In many real-world scenarios, you want both burst protection (rate limiting) and usage caps (quotas). Rate limits prevent short bursts from overwhelming your backend. Quotas enforce overall usage limits over billing periods.

Here is how to combine them:

```xml
<!-- Combine burst rate limiting with a daily quota -->
<!-- Burst: max 100 calls per minute -->
<!-- Daily: max 10,000 calls per day -->
<inbound>
    <base />
    <rate-limit calls="100" renewal-period="60" />
    <quota calls="10000" renewal-period="86400" />
</inbound>
```

The `renewal-period` for the quota is in seconds, so 86400 is one day. When the daily quota is exhausted, the consumer gets a 403 Forbidden rather than a 429.

## Customizing the 429 Response

By default, APIM returns a generic 429 response when a client hits the rate limit. You can customize this with the `retry-after-header-name` and `retry-after-variable-name` attributes, or you can catch the error in the `on-error` section and return a custom payload:

```xml
<!-- Custom error response when rate limit is exceeded -->
<on-error>
    <base />
    <choose>
        <when condition="@(context.Response.StatusCode == 429)">
            <return-response>
                <set-status code="429" reason="Rate limit exceeded" />
                <set-header name="Content-Type" exists-action="override">
                    <value>application/json</value>
                </set-header>
                <set-body>@{
                    return new JObject(
                        new JProperty("error", "rate_limit_exceeded"),
                        new JProperty("message", "You have exceeded the rate limit. Please wait before retrying."),
                        new JProperty("retryAfter", context.Response.Headers.GetValueOrDefault("Retry-After", "unknown"))
                    ).ToString();
                }</set-body>
            </return-response>
        </when>
    </choose>
</on-error>
```

## Rate Limiting Headers for Clients

Good API design means telling your clients how close they are to their limits before they hit them. While APIM does not include rate limit headers by default (beyond the Retry-After on 429s), you can add them yourself using outbound policies:

```xml
<!-- Add standard rate limit headers to every response -->
<!-- This helps clients implement their own throttling logic -->
<outbound>
    <base />
    <set-header name="X-RateLimit-Limit" exists-action="override">
        <value>100</value>
    </set-header>
    <set-header name="X-RateLimit-Remaining" exists-action="override">
        <value>@(context.Variables.GetValueOrDefault<string>("remainingCalls", "unknown"))</value>
    </set-header>
</outbound>
```

Getting the actual remaining count requires using the `remaining-calls-variable-name` attribute on the `rate-limit-by-key` policy:

```xml
<!-- Track remaining calls in a variable for use in outbound headers -->
<rate-limit-by-key
    calls="100"
    renewal-period="60"
    counter-key="@(context.Subscription.Id)"
    remaining-calls-variable-name="remainingCalls" />
```

## Multi-Region Considerations

If you are running APIM in multiple regions (Premium tier with multi-region deployment), be aware that rate limit counters are local to each gateway node by default. A client with a 100-call limit could potentially make 100 calls to each region.

For strict global rate limiting, you have a few options:

1. Use the `rate-limit` policy (subscription-based), which synchronizes counters across regions periodically.
2. Implement an external rate limiting store using Redis and a `send-request` policy to check counters before processing.
3. Accept the approximate nature of distributed rate limiting and set your limits slightly lower to account for the window.

Option 1 is the simplest but introduces slight lag in counter synchronization. Option 2 is the most accurate but adds latency to every request.

## Tiered Rate Limiting Strategy

A common pattern is to offer different rate limits for different tiers of service. You can do this by creating multiple products with different policies, or by using conditional logic in a single policy:

```xml
<!-- Apply different rate limits based on the product name -->
<inbound>
    <base />
    <choose>
        <when condition="@(context.Product.Name == "Premium")">
            <rate-limit-by-key calls="1000" renewal-period="60"
                counter-key="@(context.Subscription.Id)" />
        </when>
        <when condition="@(context.Product.Name == "Standard")">
            <rate-limit-by-key calls="100" renewal-period="60"
                counter-key="@(context.Subscription.Id)" />
        </when>
        <otherwise>
            <rate-limit-by-key calls="10" renewal-period="60"
                counter-key="@(context.Subscription.Id)" />
        </otherwise>
    </choose>
</inbound>
```

## Testing Your Rate Limits

Before going live, test your rate limits. The easiest way is to write a quick script that hammers the endpoint:

```bash
# Send 150 requests rapidly to test a 100-per-minute rate limit
# You should see 429 responses starting around request 101
for i in $(seq 1 150); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Ocp-Apim-Subscription-Key: YOUR_KEY" \
        https://yourapi.azure-api.net/orders/)
    echo "Request $i: HTTP $STATUS"
done
```

Watch for the transition from 200 to 429 responses. If you are not seeing 429s when expected, check that your policy is applied at the right scope (all operations vs. a specific operation) and that the counter key is resolving correctly.

## Monitoring Throttled Requests

In the APIM Analytics blade, you can see 429 responses in the response code breakdown. For more detailed monitoring, enable Application Insights integration and create alerts on the count of 429 responses. This helps you detect when legitimate clients are being throttled, which might mean you need to adjust your limits or the client needs a higher tier.

## Wrapping Up

Rate limiting in Azure API Management boils down to choosing the right counter key and setting appropriate limits. Use `rate-limit` for simple per-subscription throttling. Use `rate-limit-by-key` when you need granular control. Combine them with quotas for billing-period caps. And always expose rate limit headers so your clients can self-regulate.

Start conservative with your limits, monitor the actual traffic patterns, and adjust from there. It is much easier to increase a limit for a client who asks nicely than to recover from a backend outage caused by unthrottled traffic.

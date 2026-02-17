# How to Configure Apigee Rate Limiting Policies to Protect Backend APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apigee, GCP, Rate Limiting, API Management, API Security

Description: Learn how to configure Apigee Quota and SpikeArrest policies to implement effective rate limiting that protects your backend services from overuse.

---

Rate limiting is one of the most important things an API gateway does. Without it, a single misbehaving client can overwhelm your backend, a traffic spike can cascade into a full outage, and you have no way to enforce fair usage across API consumers. Apigee provides two complementary policies for rate limiting: Quota and SpikeArrest. They solve different problems and work best when used together.

## Quota vs SpikeArrest - What is the Difference

These two policies are often confused, but they serve distinct purposes:

**Quota** limits the total number of requests over a time period. For example, "1000 requests per day" or "100 requests per hour." It counts requests and rejects them once the limit is reached. Quota resets at the end of each period.

**SpikeArrest** limits the rate of requests to smooth out traffic. For example, "10 requests per second." It does not count total requests - it ensures they arrive at a steady pace. A burst of 100 requests in one second gets throttled even if the client is well within their daily quota.

Use Quota to enforce business limits (your free tier gets 1000 API calls per day). Use SpikeArrest to protect infrastructure (your backend can handle 50 requests per second).

## Setting Up a Quota Policy

Create a Quota policy that limits API consumers to a fixed number of requests per time period.

This policy limits each API key to 1000 requests per hour:

```xml
<!-- apiproxy/policies/EnforceQuota.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Quota name="EnforceQuota" type="calendar">
    <DisplayName>Enforce Quota - 1000/hour</DisplayName>

    <!-- Number of requests allowed -->
    <Allow count="1000"/>

    <!-- Time period for the quota -->
    <Interval>1</Interval>
    <TimeUnit>hour</TimeUnit>

    <!-- Use the API key as the identifier so each consumer gets their own quota -->
    <Identifier ref="client_id"/>

    <!-- When the quota starts counting (calendar-based) -->
    <StartTime>2026-01-01 00:00:00</StartTime>

    <!-- Distribute the quota evenly (prevents burst at the start of each period) -->
    <Distributed>true</Distributed>
    <Synchronous>true</Synchronous>
</Quota>
```

Attach it to your proxy endpoint's PreFlow so it runs on every request:

```xml
<!-- apiproxy/proxies/default.xml -->
<ProxyEndpoint name="default">
    <PreFlow name="PreFlow">
        <Request>
            <!-- Verify API key first -->
            <Step>
                <Name>VerifyAPIKey</Name>
            </Step>
            <!-- Then enforce quota -->
            <Step>
                <Name>EnforceQuota</Name>
            </Step>
        </Request>
        <Response/>
    </PreFlow>
    <!-- ... rest of the configuration -->
</ProxyEndpoint>
```

## Dynamic Quota Based on API Product

In real-world scenarios, different API consumers have different rate limits. Free tier users might get 100 requests per day, while paid users get 10,000. Apigee handles this through API Products.

When you create an API Product in Apigee, you can set a quota. The quota values from the product are automatically available as flow variables after API key verification.

This policy uses the quota values from the API Product:

```xml
<!-- apiproxy/policies/ProductQuota.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Quota name="ProductQuota">
    <DisplayName>Product-Based Quota</DisplayName>

    <!-- These variables are populated from the API Product configuration -->
    <Allow countRef="verifyapikey.VerifyAPIKey.apiproduct.developer.quota.limit">
        <!-- Fallback if the product does not have a quota defined -->
        <Allow count="100"/>
    </Allow>
    <Interval ref="verifyapikey.VerifyAPIKey.apiproduct.developer.quota.interval">
        <Interval>1</Interval>
    </Interval>
    <TimeUnit ref="verifyapikey.VerifyAPIKey.apiproduct.developer.quota.timeunit">
        <TimeUnit>day</TimeUnit>
    </TimeUnit>

    <Identifier ref="client_id"/>
    <Distributed>true</Distributed>
    <Synchronous>true</Synchronous>
</Quota>
```

This way, when you change a quota limit in the API Product configuration, all proxies using that product automatically pick up the new limit without redeployment.

## Setting Up SpikeArrest

SpikeArrest protects against sudden traffic bursts. It smooths out incoming traffic to a maximum rate.

This policy limits traffic to 30 requests per second:

```xml
<!-- apiproxy/policies/SpikeArrest.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SpikeArrest name="SpikeArrest">
    <DisplayName>Spike Arrest - 30/s</DisplayName>

    <!-- Maximum sustained rate -->
    <Rate>30ps</Rate>

    <!-- Optional: use a variable for the identifier -->
    <!-- Without an identifier, the rate applies globally -->
    <Identifier ref="client_id"/>
</SpikeArrest>
```

The rate can be specified as:
- `30ps` - 30 per second
- `100pm` - 100 per minute

Important detail: Apigee internally converts the rate to a per-millisecond interval. `30ps` means one request every 33 milliseconds. Two requests arriving within 33ms of each other will cause the second to be rejected, even if fewer than 30 requests arrived in that second. This is intentional - it prevents bursts.

## Combining Quota and SpikeArrest

The most effective setup uses both policies together. SpikeArrest first to smooth out bursts, then Quota to enforce business limits.

Configure both in your PreFlow:

```xml
<!-- apiproxy/proxies/default.xml -->
<ProxyEndpoint name="default">
    <PreFlow name="PreFlow">
        <Request>
            <!-- Step 1: Smooth out traffic spikes (runs before anything else) -->
            <Step>
                <Name>SpikeArrest</Name>
            </Step>
            <!-- Step 2: Verify the API key -->
            <Step>
                <Name>VerifyAPIKey</Name>
            </Step>
            <!-- Step 3: Enforce the quota for this consumer -->
            <Step>
                <Name>ProductQuota</Name>
            </Step>
        </Request>
        <Response/>
    </PreFlow>
    <!-- ... -->
</ProxyEndpoint>
```

The order matters. SpikeArrest runs first and does not require an API key (it can apply globally). Then API key verification runs. Then quota enforcement uses the verified identity.

## Customizing Rate Limit Error Responses

By default, Apigee returns generic error messages when rate limits are exceeded. You can customize these to be more helpful.

Create a fault rule that catches quota violations:

```xml
<!-- apiproxy/proxies/default.xml - add FaultRules section -->
<ProxyEndpoint name="default">
    <FaultRules>
        <FaultRule name="QuotaViolation">
            <Condition>(fault.name = "QuotaViolation")</Condition>
            <Step>
                <Name>QuotaViolationResponse</Name>
            </Step>
        </FaultRule>
        <FaultRule name="SpikeArrestViolation">
            <Condition>(fault.name = "SpikeArrestViolation")</Condition>
            <Step>
                <Name>SpikeArrestResponse</Name>
            </Step>
        </FaultRule>
    </FaultRules>
    <!-- ... -->
</ProxyEndpoint>
```

Create the custom error response policies:

```xml
<!-- apiproxy/policies/QuotaViolationResponse.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<AssignMessage name="QuotaViolationResponse">
    <DisplayName>Quota Violation Response</DisplayName>
    <Set>
        <StatusCode>429</StatusCode>
        <ReasonPhrase>Too Many Requests</ReasonPhrase>
        <Payload contentType="application/json">
{
    "error": "rate_limit_exceeded",
    "message": "You have exceeded your API quota. Please wait before making more requests.",
    "limit": "{ratelimit.EnforceQuota.allowed.count}",
    "used": "{ratelimit.EnforceQuota.used.count}",
    "reset": "{ratelimit.EnforceQuota.expiry.time}"
}
        </Payload>
        <Headers>
            <Header name="Retry-After">3600</Header>
            <Header name="X-RateLimit-Limit">{ratelimit.EnforceQuota.allowed.count}</Header>
            <Header name="X-RateLimit-Remaining">{ratelimit.EnforceQuota.available.count}</Header>
        </Headers>
    </Set>
    <IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>
</AssignMessage>
```

```xml
<!-- apiproxy/policies/SpikeArrestResponse.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<AssignMessage name="SpikeArrestResponse">
    <DisplayName>Spike Arrest Response</DisplayName>
    <Set>
        <StatusCode>429</StatusCode>
        <ReasonPhrase>Too Many Requests</ReasonPhrase>
        <Payload contentType="application/json">
{
    "error": "too_many_requests",
    "message": "Request rate is too high. Please slow down and retry.",
    "retry_after_ms": 100
}
        </Payload>
        <Headers>
            <Header name="Retry-After">1</Header>
        </Headers>
    </Set>
    <IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>
</AssignMessage>
```

## Adding Rate Limit Headers to Successful Responses

Good API design includes rate limit information in every response, not just error responses. This lets clients proactively manage their request rate.

Create a policy that adds rate limit headers to all successful responses:

```xml
<!-- apiproxy/policies/AddRateLimitHeaders.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<AssignMessage name="AddRateLimitHeaders">
    <DisplayName>Add Rate Limit Headers</DisplayName>
    <AssignTo createNew="false" transport="http" type="response"/>
    <Set>
        <Headers>
            <Header name="X-RateLimit-Limit">{ratelimit.ProductQuota.allowed.count}</Header>
            <Header name="X-RateLimit-Remaining">{ratelimit.ProductQuota.available.count}</Header>
            <Header name="X-RateLimit-Reset">{ratelimit.ProductQuota.expiry.time}</Header>
        </Headers>
    </Set>
    <IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>
</AssignMessage>
```

Attach this to the PostFlow response:

```xml
<PostFlow name="PostFlow">
    <Request/>
    <Response>
        <Step>
            <Name>AddRateLimitHeaders</Name>
        </Step>
    </Response>
</PostFlow>
```

## Testing Rate Limits

Test your rate limiting by sending rapid requests:

```bash
# Send 20 requests quickly to test SpikeArrest
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    "https://YOUR_APIGEE_HOST/weather/test" \
    -H "x-api-key: YOUR_API_KEY"
done

# Check the rate limit headers on a successful response
curl -v "https://YOUR_APIGEE_HOST/weather/test" \
  -H "x-api-key: YOUR_API_KEY" 2>&1 | grep -i "x-ratelimit"
```

You should see 200 responses followed by 429 responses once the rate limit kicks in.

## Summary

Effective rate limiting in Apigee uses SpikeArrest and Quota together. SpikeArrest smooths out traffic bursts to protect your backend infrastructure, while Quota enforces per-consumer business limits tied to API Products. Dynamic quotas from API Products let you offer different tiers without changing proxy code. Custom error responses with standard rate limit headers help API consumers understand and respect your limits. Put SpikeArrest first in the flow (it does not need authentication), then verify the API key, then apply the quota.

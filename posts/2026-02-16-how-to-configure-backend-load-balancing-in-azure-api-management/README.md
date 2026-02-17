# How to Configure Backend Load Balancing in Azure API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, Load Balancing, Backend, High Availability, Cloud

Description: Learn how to configure backend load balancing in Azure API Management to distribute traffic across multiple backend instances for resilience and performance.

---

When you have a single backend behind Azure API Management, everything is simple - requests go to one place. But in production, you usually have multiple instances of your backend running for high availability and to handle traffic spikes. APIM provides several ways to distribute requests across multiple backends, from simple round-robin to weighted routing and health-based failover.

In this post, I will walk through the different approaches to backend load balancing in APIM and show you how to configure each one with practical policy examples.

## Understanding APIM Backend Entities

Before diving into load balancing, let me explain APIM's backend concept. A Backend in APIM is a named entity that represents a downstream service. Instead of hardcoding backend URLs in your API settings or policies, you create Backend entities and reference them by name.

This abstraction is useful because:
- You can change the backend URL without modifying any policies
- You can configure credentials, circuit breakers, and TLS settings on the backend entity
- You can group multiple backend URLs for load balancing

Go to your APIM instance, navigate to "Backends," and create backends for each of your service instances:

- Backend 1: `order-service-east` pointing to `https://orders-east.azurewebsites.net`
- Backend 2: `order-service-west` pointing to `https://orders-west.azurewebsites.net`

## Round-Robin Load Balancing with Policies

The most straightforward approach is round-robin distribution using a policy expression. APIM does not have a built-in load balancer policy, but you can implement one with a few lines of C#:

```xml
<!-- Round-robin load balancing across two backend instances -->
<!-- Uses the request ID hash to distribute requests evenly -->
<inbound>
    <base />
    <set-variable name="backendUrl" value="@{
        // Use a hash of the request ID for consistent distribution
        var backends = new[] {
            "https://orders-east.azurewebsites.net",
            "https://orders-west.azurewebsites.net"
        };
        var index = Math.Abs(context.RequestId.GetHashCode()) % backends.Length;
        return backends[index];
    }" />
    <set-backend-service base-url="@((string)context.Variables["backendUrl"])" />
</inbound>
```

This hashes the request ID and uses the modulo operator to pick a backend. Since request IDs are random GUIDs, the distribution is roughly even.

## Weighted Load Balancing

Sometimes you want to send more traffic to one backend than another - maybe you are doing a gradual migration or one instance has more capacity. Here is a weighted distribution:

```xml
<!-- Weighted load balancing: 70% to primary, 30% to secondary -->
<!-- Useful for gradual migrations or capacity-based routing -->
<inbound>
    <base />
    <set-variable name="backendUrl" value="@{
        var random = new Random(context.RequestId.GetHashCode());
        var roll = random.Next(1, 101);

        // 70% chance of primary, 30% chance of secondary
        if (roll <= 70)
        {
            return "https://orders-primary.azurewebsites.net";
        }
        else
        {
            return "https://orders-secondary.azurewebsites.net";
        }
    }" />
    <set-backend-service base-url="@((string)context.Variables["backendUrl"])" />
</inbound>
```

## Using APIM Backend Pool (Built-in Load Balancing)

Starting with more recent APIM updates, you can use the Backend Pool feature for native load balancing. This is configured through the Azure Portal or ARM templates rather than policies.

Create a backend pool that groups multiple backend entities:

```json
{
    "properties": {
        "title": "Order Service Pool",
        "description": "Load-balanced pool of order service instances",
        "type": "pool",
        "pool": {
            "services": [
                {
                    "id": "/backends/order-service-east",
                    "weight": 50
                },
                {
                    "id": "/backends/order-service-west",
                    "weight": 50
                }
            ]
        }
    }
}
```

Then reference the pool in your API's backend settings or in a policy:

```xml
<!-- Use the backend pool for automatic load balancing -->
<inbound>
    <base />
    <set-backend-service backend-id="order-service-pool" />
</inbound>
```

APIM handles the distribution automatically based on the weights you configured.

## Active-Passive Failover

For disaster recovery, you might want an active-passive setup where traffic goes to the primary backend unless it is down, in which case it fails over to the secondary. Implement this with a `send-request` health check or by catching errors:

```xml
<!-- Active-passive failover: try primary first, fall back to secondary -->
<!-- If the primary returns an error, retry against the secondary backend -->
<inbound>
    <base />
    <set-backend-service base-url="https://orders-primary.azurewebsites.net" />
</inbound>
<backend>
    <forward-request timeout="10" />
</backend>
<outbound>
    <base />
    <choose>
        <!-- If primary failed with 5xx, retry on secondary -->
        <when condition="@(context.Response.StatusCode >= 500)">
            <send-request mode="copy" response-variable-name="fallbackResponse" timeout="10">
                <set-url>@($"https://orders-secondary.azurewebsites.net{context.Request.Url.Path}{context.Request.Url.QueryString}")</set-url>
            </send-request>
            <return-response response-variable-name="fallbackResponse" />
        </when>
    </choose>
</outbound>
```

This approach adds latency on failure (because the primary request has to time out first), but it ensures that the secondary only receives traffic when the primary is genuinely down.

## Health-Based Routing

A more sophisticated approach is to proactively check backend health and route traffic only to healthy instances. You can implement this with a scheduled health check using `send-request`:

```xml
<!-- Check backend health and route only to healthy instances -->
<!-- The health status is cached for 30 seconds to avoid excessive checks -->
<inbound>
    <base />
    <cache-lookup-value key="east-health" variable-name="eastHealthy" default-value="true" />
    <cache-lookup-value key="west-health" variable-name="westHealthy" default-value="true" />
    <choose>
        <when condition="@((string)context.Variables["eastHealthy"] == "true")">
            <set-backend-service base-url="https://orders-east.azurewebsites.net" />
        </when>
        <when condition="@((string)context.Variables["westHealthy"] == "true")">
            <set-backend-service base-url="https://orders-west.azurewebsites.net" />
        </when>
        <otherwise>
            <return-response>
                <set-status code="503" reason="Service Unavailable" />
                <set-body>All backend instances are unhealthy</set-body>
            </return-response>
        </otherwise>
    </choose>
</inbound>
```

You would update the health cache values from a separate scheduled policy or an Azure Function that pings each backend periodically.

## Geographic Routing

If your backends are deployed in multiple regions and your APIM instance is in a single region, you can route based on the client's location using the `context.Request.IpAddress` and a GeoIP lookup, or simply based on a header:

```xml
<!-- Route to the nearest backend based on a region header -->
<!-- The CDN or front door sets this header based on client location -->
<inbound>
    <base />
    <choose>
        <when condition="@(context.Request.Headers.GetValueOrDefault("X-Client-Region","").StartsWith("eu"))">
            <set-backend-service base-url="https://orders-eu.azurewebsites.net" />
        </when>
        <when condition="@(context.Request.Headers.GetValueOrDefault("X-Client-Region","").StartsWith("ap"))">
            <set-backend-service base-url="https://orders-apac.azurewebsites.net" />
        </when>
        <otherwise>
            <set-backend-service base-url="https://orders-us.azurewebsites.net" />
        </otherwise>
    </choose>
</inbound>
```

For true geographic routing at the gateway level, combine APIM with Azure Front Door or Traffic Manager, which provide DNS-based geographic routing.

## Session Affinity (Sticky Sessions)

Some backends maintain session state and need requests from the same client to go to the same instance. You can implement sticky sessions by hashing a consistent key:

```xml
<!-- Sticky sessions: route the same user to the same backend -->
<!-- Uses the subscription ID as the affinity key -->
<inbound>
    <base />
    <set-variable name="backendUrl" value="@{
        var backends = new[] {
            "https://orders-instance-1.azurewebsites.net",
            "https://orders-instance-2.azurewebsites.net",
            "https://orders-instance-3.azurewebsites.net"
        };
        // Hash the subscription ID for consistent routing
        var key = context.Subscription?.Id ?? context.Request.IpAddress;
        var index = Math.Abs(key.GetHashCode()) % backends.Length;
        return backends[index];
    }" />
    <set-backend-service base-url="@((string)context.Variables["backendUrl"])" />
</inbound>
```

Since the subscription ID is constant for a given consumer, they will always be routed to the same backend instance (as long as the number of backends does not change).

## Monitoring Backend Health

Whatever load balancing strategy you use, monitor your backends. Enable Application Insights on your APIM instance and track:

- Response times per backend (to detect slow instances)
- Error rates per backend (to detect failing instances)
- Request distribution (to verify your balancing is working as expected)

Set up alerts for when a single backend's error rate exceeds a threshold, so you can investigate before it affects all traffic.

## Summary

Backend load balancing in Azure API Management ranges from simple round-robin with policy expressions to sophisticated health-based routing with backend pools. For most scenarios, start with the built-in backend pool feature for simple weighted distribution. Add failover logic for resilience. Use geographic routing when latency matters. And monitor everything so you know when a backend needs attention. The right approach depends on your architecture, but the policy engine gives you enough flexibility to implement whatever strategy you need.

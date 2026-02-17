# How to Troubleshoot Azure API Management Gateway Response Latency Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, Latency, Gateway, Performance, Troubleshooting, API Gateway

Description: Diagnose and fix Azure API Management gateway response latency issues using diagnostic logs, tracing, and policy optimization techniques.

---

Azure API Management (APIM) sits between your clients and your backend APIs. In a well-configured setup, it adds minimal latency while providing security, rate limiting, caching, and transformation capabilities. But when latency spikes occur, every API consumer feels the pain. A 200ms increase in APIM gateway latency means a 200ms increase for every single API call flowing through it.

I have debugged APIM latency issues for organizations processing millions of API calls daily. The root cause usually falls into one of several categories: backend latency, policy execution overhead, gateway resource constraints, or network path issues. Let me walk through how to diagnose and fix each one.

## Measuring Where Latency Lives

Before you can fix latency, you need to know where it is coming from. APIM tracks several timing metrics that help you isolate the problem.

Enable diagnostic logging to send APIM request data to Log Analytics.

```bash
# Enable diagnostic settings for API Management
az monitor diagnostic-settings create \
  --name "apim-diagnostics" \
  --resource "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.ApiManagement/service/myAPIM" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myLAW" \
  --logs '[{"category":"GatewayLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

Now query the logs to break down where time is spent.

```
// KQL query to analyze APIM latency breakdown
// Shows client latency vs backend latency vs APIM processing time
ApiManagementGatewayLogs
| where TimeGenerated > ago(1h)
| extend totalTime = ResponseTime
| extend backendTime = BackendTime
| extend apimOverhead = ResponseTime - BackendTime
| summarize
    avgTotal = avg(totalTime),
    avgBackend = avg(backendTime),
    avgOverhead = avg(apimOverhead),
    p95Total = percentile(totalTime, 95),
    p95Backend = percentile(backendTime, 95),
    p95Overhead = percentile(apimOverhead, 95)
  by bin(TimeGenerated, 5m)
| order by TimeGenerated desc
```

This query breaks latency into three components:
- **Backend time**: How long the backend API took to respond
- **APIM overhead**: Time spent in APIM processing (policy execution, routing, response handling)
- **Total time**: What the client experiences

If backend time dominates, the problem is in your backend service. If APIM overhead is high, the problem is in APIM configuration.

## Backend Latency Issues

In most cases, the backend API is the bottleneck, not APIM itself. APIM just makes the latency visible because it logs timing data.

Check which specific APIs and operations have the highest backend latency.

```
// Find the slowest API operations by backend response time
ApiManagementGatewayLogs
| where TimeGenerated > ago(1h)
| summarize
    avgBackend = avg(BackendTime),
    p95Backend = percentile(BackendTime, 95),
    count = count()
  by ApiId, OperationId
| order by p95Backend desc
| take 20
```

If specific endpoints are slow, the fix is on the backend side: optimize database queries, add caching, or scale the backend service.

## Policy Execution Overhead

APIM policies execute in the request pipeline and can add significant latency if they perform heavy operations.

### Enable Request Tracing

For debugging individual requests, enable tracing to see exactly how long each policy takes.

```bash
# Enable tracing for a specific request by adding the trace header
curl -H "Ocp-Apim-Trace: true" \
     -H "Ocp-Apim-Subscription-Key: your-key" \
     "https://myapim.azure-api.net/api/myendpoint"
```

The trace URL in the response header shows a detailed breakdown of policy execution times.

### Common Policy Performance Problems

**validate-jwt policy with remote JWKS.** If your JWT validation policy fetches keys from a remote JWKS endpoint, every request incurs a network call. APIM caches JWKS keys, but if the cache is cold or the JWKS endpoint is slow, validation adds latency.

```xml
<!-- Slow: Fetches JWKS on every cache miss -->
<validate-jwt header-name="Authorization" failed-validation-httpcode="401">
    <openid-config url="https://login.microsoftonline.com/{tenant}/.well-known/openid-configuration" />
</validate-jwt>
```

Fix: This is usually acceptable since APIM caches the JWKS keys. But if latency spikes correlate with JWKS endpoint issues, consider using static keys in the policy.

**send-request policy for authorization.** If policies make outbound HTTP calls (for example, calling an authorization service), each call adds its full round-trip time to the request latency.

```xml
<!-- This adds the authorization service's latency to every request -->
<send-request mode="new" response-variable-name="authResponse" timeout="10">
    <set-url>https://auth-service.internal/validate</set-url>
    <set-method>POST</set-method>
    <set-body>@(context.Request.Headers.GetValueOrDefault("Authorization",""))</set-body>
</send-request>
```

Fix: Cache authorization results using the cache-lookup-value and cache-store-value policies.

```xml
<!-- Cache authorization results to avoid repeated outbound calls -->
<cache-lookup-value key="@("auth-" + context.Request.Headers.GetValueOrDefault("Authorization",""))"
                    variable-name="cachedAuth" />
<choose>
    <when condition="@(context.Variables.ContainsKey("cachedAuth"))">
        <!-- Use cached result - no outbound call needed -->
    </when>
    <otherwise>
        <send-request mode="new" response-variable-name="authResponse" timeout="10">
            <set-url>https://auth-service.internal/validate</set-url>
            <set-method>POST</set-method>
        </send-request>
        <!-- Cache the result for 5 minutes -->
        <cache-store-value key="@("auth-" + context.Request.Headers.GetValueOrDefault("Authorization",""))"
                          value="@(((IResponse)context.Variables["authResponse"]).Body.As<string>())"
                          duration="300" />
    </otherwise>
</choose>
```

**Large request/response transformations.** Policies that parse and transform large JSON or XML payloads consume CPU and memory. If your API returns multi-megabyte responses and you have transformation policies, the processing time can be substantial.

Fix: Minimize transformation of large payloads. If possible, have the backend return data in the format the client needs.

## Response Caching

For APIs that return data that does not change frequently, implement response caching at the APIM layer.

```xml
<!-- Cache API responses for 5 minutes -->
<!-- Dramatically reduces both backend latency and APIM processing time for repeated requests -->
<inbound>
    <cache-lookup vary-by-developer="false"
                  vary-by-developer-groups="false"
                  caching-type="internal">
        <vary-by-query-parameter>page</vary-by-query-parameter>
        <vary-by-query-parameter>pageSize</vary-by-query-parameter>
    </cache-lookup>
</inbound>
<outbound>
    <cache-store duration="300" />
</outbound>
```

Response caching can reduce p95 latency dramatically for read-heavy APIs. Monitor cache hit rates to ensure the cache is effective.

## APIM SKU and Capacity

If overall latency is high across all APIs and the APIM overhead component is significant, the APIM instance might be under-resourced.

Check capacity metrics in Azure Monitor. The Capacity metric shows the percentage of the instance's compute resources being used. If capacity consistently exceeds 70%, add more units or scale to a higher SKU.

```bash
# Check APIM capacity metric
az monitor metrics list \
  --resource "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.ApiManagement/service/myAPIM" \
  --metric "Capacity" \
  --interval PT5M \
  --aggregation Average \
  -o table
```

APIM SKU options and their performance characteristics:
- **Developer**: Single unit, no SLA, for dev/test only
- **Basic**: Up to 2 units, limited performance
- **Standard**: Up to 4 units, good for most production workloads
- **Premium**: Up to 12 units per region, multi-region, VNet integration

## Network Path Optimization

If your APIM instance and backend are in different regions, the network round-trip between them adds unavoidable latency. Deploy APIM units in the same region as your backend services.

For multi-region deployments, use APIM's multi-region feature (Premium tier) to deploy gateway instances in multiple regions. Each regional gateway connects to the nearest backend, minimizing network latency.

Also verify that if APIM is VNet-integrated, the DNS resolution and routing to backend services are optimal. VNet peering hops and firewall inspection can add latency that does not exist in non-VNet configurations.

## Continuous Latency Monitoring

Set up alerts for latency degradation so you catch issues before users report them.

```bash
# Alert when p95 response time exceeds 2 seconds
az monitor metrics alert create \
  --name "apim-high-latency" \
  --resource-group myRG \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.ApiManagement/service/myAPIM" \
  --condition "avg Duration > 2000" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action "/subscriptions/{sub-id}/resourceGroups/rg-monitoring/providers/microsoft.insights/actionGroups/ag-oncall"
```

APIM latency troubleshooting is all about measurement. Break down the total latency into its components, identify the dominant contributor, and optimize accordingly. Most of the time, the fix is in the backend service or in policy optimization, not in APIM itself.

# How to Replace Application-Level Circuit Breakers with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Circuit Breaker, Resilience, DestinationRule, Microservices

Description: Replace application-level circuit breaker implementations like Hystrix, resilience4j, and Polly with Istio DestinationRule outlier detection for infrastructure-level circuit breaking.

---

Circuit breakers prevent cascading failures in distributed systems. When a downstream service starts failing, the circuit breaker trips and stops sending requests to it, giving the failing service time to recover instead of overwhelming it with traffic that will just fail anyway.

Most teams implement circuit breakers in application code using libraries like Hystrix, resilience4j, Polly, or gobreaker. These work, but they create a maintenance burden: every service needs the library, every team configures it differently, and changing circuit breaker settings requires a code deployment.

Istio moves circuit breaking to the Envoy proxy, making it consistent across all services and configurable without code changes.

## How Application-Level Circuit Breakers Work

A typical circuit breaker has three states:

1. **Closed**: Requests flow normally. The breaker monitors failure rates.
2. **Open**: Too many failures occurred. All requests are immediately rejected without hitting the backend.
3. **Half-Open**: After a cooldown period, a few test requests are allowed through to see if the backend has recovered.

Here is what this looks like in code:

### Hystrix (Java)

```java
@HystrixCommand(
    fallbackMethod = "getDefaultResponse",
    commandProperties = {
        @HystrixProperty(name = "circuitBreaker.requestVolumeThreshold", value = "10"),
        @HystrixProperty(name = "circuitBreaker.errorThresholdPercentage", value = "50"),
        @HystrixProperty(name = "circuitBreaker.sleepWindowInMilliseconds", value = "30000")
    }
)
public String callService() {
    return restTemplate.getForObject("http://backend/api/data", String.class);
}
```

### resilience4j (Java)

```java
CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .failureRateThreshold(50)
    .waitDurationInOpenState(Duration.ofSeconds(30))
    .slidingWindowSize(10)
    .build();

CircuitBreaker circuitBreaker = CircuitBreaker.of("backend", config);

Supplier<String> supplier = CircuitBreaker.decorateSupplier(circuitBreaker,
    () -> restTemplate.getForObject("http://backend/api/data", String.class));
```

### Polly (.NET)

```csharp
var circuitBreakerPolicy = Policy
    .Handle<HttpRequestException>()
    .OrResult<HttpResponseMessage>(r => !r.IsSuccessStatusCode)
    .CircuitBreakerAsync(
        handledEventsAllowedBeforeBreaking: 5,
        durationOfBreak: TimeSpan.FromSeconds(30));
```

### gobreaker (Go)

```go
cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "backend",
    MaxRequests: 3,
    Interval:    10 * time.Second,
    Timeout:     30 * time.Second,
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        return counts.ConsecutiveFailures > 5
    },
})
```

## How Istio Circuit Breaking Works

Istio implements circuit breaking differently from the classic open/closed/half-open model. It uses two mechanisms:

1. **Connection pool limits**: Caps the number of concurrent connections and requests
2. **Outlier detection**: Ejects unhealthy hosts from the load balancing pool

Together, these provide effective circuit breaking at the proxy level.

### Connection Pool Limits

Connection pool settings prevent any single service from overwhelming a backend:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-service
spec:
  host: backend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 10
        maxRetries: 3
```

When these limits are exceeded, Envoy returns a 503 with the `UO` (upstream overflow) flag. This is the equivalent of the circuit breaker rejecting requests in the "open" state.

### Outlier Detection

Outlier detection is the Istio equivalent of per-host circuit breaking. It monitors endpoints and ejects unhealthy ones:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-service
spec:
  host: backend-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
```

- **consecutive5xxErrors**: Number of consecutive 5xx errors before ejecting a host (like the error threshold)
- **interval**: How often the detection algorithm runs (like the sliding window)
- **baseEjectionTime**: How long an ejected host stays out (like the sleep window)
- **maxEjectionPercent**: Maximum percentage of hosts that can be ejected at once
- **minHealthPercent**: If the percentage of healthy hosts drops below this, outlier detection is disabled to prevent ejecting everything

## Mapping Application Settings to Istio

Here is how to translate your existing circuit breaker settings:

| Application Setting | Istio Equivalent |
|---|---|
| Error threshold percentage | `outlierDetection.consecutive5xxErrors` (count-based, not percentage) |
| Sleep window | `outlierDetection.baseEjectionTime` |
| Request volume threshold | `outlierDetection.interval` + `consecutive5xxErrors` |
| Max concurrent requests | `connectionPool.http.http2MaxRequests` |
| Timeout | VirtualService `timeout` field |
| Fallback | Keep in application code |

Note that Istio uses consecutive error counts instead of error percentages. If your Hystrix config uses `errorThresholdPercentage: 50`, you need to estimate what that means in terms of consecutive errors and set `consecutive5xxErrors` accordingly.

## Step-by-Step Migration

### Step 1: Create the DestinationRule

Based on your current circuit breaker settings, create a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-service
spec:
  host: backend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

Apply it:

```bash
kubectl apply -f destinationrule.yaml
```

### Step 2: Test the Circuit Breaking

You can test by overloading the service and watching for 503s:

```bash
# Use fortio for load testing
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/httpbin/sample-client/fortio-deploy.yaml

FORTIO_POD=$(kubectl get pod -l app=fortio -o jsonpath='{.items[0].metadata.name}')
kubectl exec $FORTIO_POD -c fortio -- fortio load -c 200 -qps 0 -n 2000 http://backend-service:8080/api/data
```

Check for overflow:

```bash
kubectl exec $FORTIO_POD -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_rq_pending_overflow"
```

### Step 3: Remove Application Circuit Breakers

Once you have confirmed Istio circuit breaking works correctly, remove the application-level circuit breakers.

For resilience4j, remove the dependency and all `@CircuitBreaker` annotations:

```xml
<!-- Remove from pom.xml -->
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot2</artifactId>
</dependency>
```

For Polly in .NET, remove the policy wrapping:

```csharp
// Before
var response = await circuitBreakerPolicy.ExecuteAsync(
    () => httpClient.GetAsync("http://backend/api/data"));

// After
var response = await httpClient.GetAsync("http://backend/api/data");
```

### Step 4: Handle Fallbacks

Istio does not have a fallback mechanism. When the circuit breaker trips (connection pool overflow or all hosts ejected), Envoy returns a 503. Your application needs to handle this:

```java
public String callBackend() {
    try {
        return restTemplate.getForObject("http://backend/api/data", String.class);
    } catch (HttpServerErrorException e) {
        if (e.getStatusCode().value() == 503) {
            return getDefaultResponse();  // Your fallback
        }
        throw e;
    }
}
```

This is simpler than a full circuit breaker library. You just need error handling for 503 responses.

### Step 5: Monitor Circuit Breaker Behavior

Check Envoy stats:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- curl -s localhost:15000/stats | grep -E "overflow|ejection"
```

Key metrics:
- `upstream_rq_pending_overflow` - Requests rejected due to connection pool limits
- `outlier_detection.ejections_active` - Currently ejected hosts
- `outlier_detection.ejections_total` - Total ejections over time
- `outlier_detection.ejections_consecutive_5xx` - Ejections due to 5xx errors

In Prometheus:

```text
envoy_cluster_upstream_rq_pending_overflow{cluster_name="outbound|8080||backend-service.default.svc.cluster.local"}
```

## Differences to Be Aware Of

1. **Per-host vs per-service**: Application circuit breakers typically operate per-service (one breaker for all instances). Istio outlier detection works per-host (each endpoint is tracked individually). This is actually better because one bad instance does not affect healthy ones.

2. **No half-open state**: Istio does not have a formal half-open state. After `baseEjectionTime` expires, the host is added back to the pool. If it fails again, it gets ejected for `baseEjectionTime * number_of_ejections`, implementing exponential backoff.

3. **No custom error conditions**: Istio circuit breaking triggers on 5xx errors and connection failures. If your application-level breaker triggered on specific business logic errors (e.g., specific response body content), you need to keep that logic in the application.

Replacing application-level circuit breakers with Istio is mostly about trusting the infrastructure to handle a concern that was previously in your code. The result is simpler services, consistent behavior, and circuit breaking that works the same across all languages and frameworks in your mesh.

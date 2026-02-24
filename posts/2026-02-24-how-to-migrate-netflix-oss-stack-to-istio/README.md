# How to Migrate Netflix OSS Stack to Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Netflix OSS, Migration, Eureka, Hystrix, Zuul

Description: Replace Netflix OSS components like Eureka, Hystrix, Zuul, and Ribbon with Istio service mesh equivalents for a cleaner, infrastructure-level approach to microservices.

---

The Netflix OSS stack was groundbreaking when it came out. Eureka, Ribbon, Hystrix, Zuul, and Archaius gave developers tools to build resilient microservices in Java. But these are all application-level libraries. Every service needs to include them, configure them, and keep them updated. With Netflix deprecating several of these components, many teams are looking at Istio as a replacement that moves these concerns to the infrastructure layer.

Here is a practical migration path from the Netflix OSS stack to Istio.

## Netflix OSS to Istio Mapping

| Netflix OSS | Purpose | Istio Equivalent |
|---|---|---|
| Eureka | Service discovery | Kubernetes Services + Istio registry |
| Ribbon | Client-side load balancing | Envoy sidecar load balancing |
| Hystrix | Circuit breaker | DestinationRule outlierDetection + connectionPool |
| Zuul 1 / Zuul 2 | API gateway / edge proxy | Istio Gateway + VirtualService |
| Archaius | Dynamic configuration | ConfigMap + Helm values |
| Turbine | Hystrix metrics aggregation | Prometheus + Grafana via Istio metrics |

## Phase 1: Set Up Istio Alongside Netflix OSS

Start by installing Istio without disrupting anything:

```bash
istioctl install --set profile=default
```

Configure PERMISSIVE mTLS so existing services continue to work:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

Enable sidecar injection on a non-production namespace first:

```bash
kubectl label namespace staging istio-injection=enabled
kubectl rollout restart deployment -n staging
```

At this point, both Netflix OSS and Istio are active. The Eureka registry still works, Ribbon still does client-side load balancing, and the Envoy sidecar passes traffic through transparently.

## Phase 2: Migrate Away from Eureka

Eureka requires a server component and client libraries in every service. With Kubernetes, service discovery is built in through DNS. Istio enhances this with its own service registry that the Envoy sidecar uses.

### Step 1: Update service calls to use Kubernetes DNS

If your services call each other using Eureka names:

```java
// Netflix OSS way
@LoadBalanced
@Bean
public RestTemplate restTemplate() {
    return new RestTemplate();
}

// Usage: calls Eureka-registered service "payment-service"
restTemplate.getForObject("http://payment-service/api/pay", Response.class);
```

With Kubernetes DNS, the same code works without `@LoadBalanced` because Kubernetes resolves `payment-service` to the ClusterIP:

```java
@Bean
public RestTemplate restTemplate() {
    return new RestTemplate();  // No @LoadBalanced needed
}

// Same URL, but resolved by Kubernetes DNS instead of Eureka
restTemplate.getForObject("http://payment-service/api/pay", Response.class);
```

### Step 2: Remove Eureka client dependencies

```xml
<!-- Remove from pom.xml -->
<dependency>
    <groupId>com.netflix.eureka</groupId>
    <artifactId>eureka-client</artifactId>
</dependency>
```

Remove `@EnableEurekaClient` from your application class and Eureka configuration from `application.yml`.

### Step 3: Decommission the Eureka server

After all services are updated and tested, shut down the Eureka server deployment.

## Phase 3: Replace Ribbon with Envoy Load Balancing

With Eureka gone, Ribbon has no service registry to work with anyway. But even if you kept Eureka, Envoy's load balancing is better because it works at the proxy level and supports more algorithms.

Remove Ribbon:

```xml
<dependency>
    <groupId>com.netflix.ribbon</groupId>
    <artifactId>ribbon</artifactId>
</dependency>
```

Remove the `@LoadBalanced` annotation from your RestTemplate beans. The Envoy sidecar intercepts all outgoing traffic and load balances it automatically.

Configure the load balancing strategy in Istio:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
```

For consistent hashing (sticky sessions):

```yaml
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
```

## Phase 4: Replace Hystrix with Istio Circuit Breaking

Hystrix is in maintenance mode and Netflix recommends moving away from it. Istio provides equivalent circuit breaking at the proxy level.

Remove Hystrix:

```xml
<dependency>
    <groupId>com.netflix.hystrix</groupId>
    <artifactId>hystrix-core</artifactId>
</dependency>
<dependency>
    <groupId>com.netflix.hystrix</groupId>
    <artifactId>hystrix-javanica</artifactId>
</dependency>
```

Remove `@HystrixCommand` annotations and the `@EnableHystrix` / `@EnableCircuitBreaker` annotation.

The Hystrix configuration:

```java
@HystrixCommand(
    fallbackMethod = "fallback",
    commandProperties = {
        @HystrixProperty(name = "circuitBreaker.requestVolumeThreshold", value = "10"),
        @HystrixProperty(name = "circuitBreaker.errorThresholdPercentage", value = "50"),
        @HystrixProperty(name = "circuitBreaker.sleepWindowInMilliseconds", value = "30000"),
        @HystrixProperty(name = "execution.isolation.thread.timeoutInMilliseconds", value = "5000")
    }
)
```

Translates to this Istio configuration:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

And the timeout goes in the VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
spec:
  hosts:
    - payment-service
  http:
    - route:
        - destination:
            host: payment-service
      timeout: 5s
```

Important note: Istio does not have a built-in fallback mechanism like Hystrix's `fallbackMethod`. If you need fallbacks, keep them in your application code with standard try-catch error handling.

## Phase 5: Replace Zuul with Istio Ingress

Zuul (or Zuul 2) serves as the API gateway. Replace it with Istio's ingress gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: api-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: api-tls-cert
      hosts:
        - "api.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-routes
spec:
  hosts:
    - "api.example.com"
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /api/payments
      route:
        - destination:
            host: payment-service
            port:
              number: 8080
    - match:
        - uri:
            prefix: /api/orders
      route:
        - destination:
            host: order-service
            port:
              number: 8080
```

If Zuul had custom filters for things like authentication, rate limiting, or header manipulation, those translate to Istio features:

- Authentication filters become RequestAuthentication + AuthorizationPolicy
- Rate limiting uses Envoy rate limit filters
- Header manipulation uses VirtualService header rules

After verifying the Istio ingress works, decommission the Zuul deployment.

## Phase 6: Replace Turbine with Istio Metrics

Turbine aggregated Hystrix metrics across services. With Istio, you get richer metrics automatically through Prometheus:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
```

Istio generates metrics like:
- `istio_requests_total` (request count by source, destination, response code)
- `istio_request_duration_milliseconds` (latency histogram)
- `istio_tcp_sent_bytes_total` / `istio_tcp_received_bytes_total`

These are far more detailed than Hystrix metrics and do not require any client libraries.

## Phase 7: Enable STRICT mTLS

After all Netflix OSS components are removed and all services have sidecars:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict
  namespace: default
spec:
  mtls:
    mode: STRICT
```

## Migration Tips

- Migrate one service at a time, not all at once
- Run Netflix OSS and Istio in parallel during transition
- Test each phase thoroughly in staging before production
- Keep fallback logic in application code (Istio does not replace application-level fallbacks)
- Remove Netflix OSS dependencies only after confirming Istio equivalents work

The migration from Netflix OSS to Istio is less about rewriting code and more about removing code. Your services get simpler because the networking concerns are handled by the mesh, not by libraries in your application.

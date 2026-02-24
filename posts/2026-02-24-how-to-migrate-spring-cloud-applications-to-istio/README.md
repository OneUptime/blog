# How to Migrate Spring Cloud Applications to Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Spring Cloud, Migration, Java, Microservices

Description: Step-by-step guide to replacing Spring Cloud infrastructure components like Eureka, Ribbon, Hystrix, and Zuul with Istio service mesh equivalents.

---

Spring Cloud gave Java developers a solid set of tools for building microservices: Eureka for service discovery, Ribbon for client-side load balancing, Hystrix for circuit breaking, Zuul for API gateway routing, and Spring Cloud Config for centralized configuration. These work well, but they are all application-level libraries that you have to integrate, configure, and maintain inside your code.

Istio moves these concerns to the infrastructure layer. You get service discovery, load balancing, circuit breaking, and routing without any library dependencies in your application code. Here is how to make the transition.

## What Replaces What

| Spring Cloud Component | Istio Equivalent |
|---|---|
| Eureka (service discovery) | Kubernetes Service + Istio service registry |
| Ribbon (client load balancing) | Envoy proxy load balancing |
| Hystrix (circuit breaker) | DestinationRule outlierDetection |
| Zuul / Spring Cloud Gateway | Istio Gateway + VirtualService |
| Spring Cloud Config | ConfigMap/Secret (not Istio, but part of the migration) |
| Sleuth / Zipkin (tracing) | Istio distributed tracing |
| Spring Cloud Security (OAuth) | Istio AuthorizationPolicy + RequestAuthentication |

## Step 1: Remove Eureka and Use Kubernetes Services

In Spring Cloud, services register with Eureka and discover each other through it. With Istio, services discover each other through Kubernetes DNS and the Istio service registry.

Remove the Eureka dependency from your `pom.xml`:

```xml
<!-- Remove this -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```

Remove the `@EnableEurekaClient` or `@EnableDiscoveryClient` annotation from your main class.

Update your `application.yml` to remove Eureka config:

```yaml
# Remove all of this
eureka:
  client:
    serviceUrl:
      defaultZone: http://eureka:8761/eureka/
```

Instead of calling services by their Eureka name, use the Kubernetes service DNS name:

```java
// Before (Eureka)
restTemplate.getForObject("http://order-service/api/orders", Order[].class);

// After (Kubernetes DNS)
restTemplate.getForObject("http://order-service.default.svc.cluster.local/api/orders", Order[].class);

// Or just the short name if in the same namespace
restTemplate.getForObject("http://order-service/api/orders", Order[].class);
```

The short service name still works because Kubernetes DNS resolves it within the same namespace.

## Step 2: Remove Ribbon and Rely on Envoy Load Balancing

Ribbon does client-side load balancing in Spring Cloud. With Istio, the Envoy sidecar handles load balancing transparently.

Remove Ribbon from `pom.xml`:

```xml
<!-- Remove this -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-ribbon</artifactId>
</dependency>
```

Remove Ribbon configuration from `application.yml`:

```yaml
# Remove all of this
order-service:
  ribbon:
    NFLoadBalancerRuleClassName: com.netflix.loadbalancer.RoundRobinRule
```

Configure load balancing in Istio instead:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
```

Istio supports ROUND_ROBIN, LEAST_REQUEST, RANDOM, and PASSTHROUGH load balancing algorithms.

## Step 3: Replace Hystrix with Istio Circuit Breaking

Remove Hystrix:

```xml
<!-- Remove this -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-hystrix</artifactId>
</dependency>
```

Remove `@EnableHystrix` and `@HystrixCommand` annotations:

```java
// Before
@HystrixCommand(fallbackMethod = "getDefaultOrders",
    commandProperties = {
        @HystrixProperty(name = "circuitBreaker.requestVolumeThreshold", value = "5"),
        @HystrixProperty(name = "circuitBreaker.errorThresholdPercentage", value = "50")
    })
public List<Order> getOrders() {
    return restTemplate.getForObject("http://order-service/api/orders", Order[].class);
}

// After - just a plain method
public List<Order> getOrders() {
    return restTemplate.getForObject("http://order-service/api/orders", Order[].class);
}
```

Configure circuit breaking in Istio:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 100
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

Note: Istio's circuit breaking does not have a fallback mechanism like Hystrix. If you need fallbacks, keep them in your application code (you can use try/catch or a custom retry wrapper).

## Step 4: Replace Zuul with Istio Ingress

Remove the Zuul gateway service entirely. Replace it with Istio Gateway and VirtualService:

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
            prefix: /api/orders
      route:
        - destination:
            host: order-service
            port:
              number: 8080
    - match:
        - uri:
            prefix: /api/users
      route:
        - destination:
            host: user-service
            port:
              number: 8080
    - match:
        - uri:
            prefix: /api/products
      route:
        - destination:
            host: product-service
            port:
              number: 8080
```

This replaces the Zuul route configuration:

```yaml
# This Zuul config is no longer needed
zuul:
  routes:
    orders:
      path: /api/orders/**
      serviceId: order-service
    users:
      path: /api/users/**
      serviceId: user-service
```

## Step 5: Replace Sleuth with Istio Tracing

Remove Spring Cloud Sleuth:

```xml
<!-- Remove this -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-sleuth</artifactId>
</dependency>
```

Istio automatically generates trace spans for every request. However, your application needs to propagate trace context headers for distributed tracing to work across services. These headers are:

- `x-request-id`
- `x-b3-traceid`
- `x-b3-spanid`
- `x-b3-parentspanid`
- `x-b3-sampled`
- `x-b3-flags`
- `traceparent`
- `tracestate`

In Spring, add a filter or interceptor to propagate these:

```java
@Component
public class TracingInterceptor implements ClientHttpRequestInterceptor {

    @Autowired
    private HttpServletRequest request;

    @Override
    public ClientHttpResponse intercept(HttpRequest outgoing, byte[] body,
            ClientHttpRequestExecution execution) throws IOException {
        String[] traceHeaders = {"x-request-id", "x-b3-traceid", "x-b3-spanid",
                "x-b3-parentspanid", "x-b3-sampled", "traceparent", "tracestate"};
        for (String header : traceHeaders) {
            String value = request.getHeader(header);
            if (value != null) {
                outgoing.getHeaders().set(header, value);
            }
        }
        return execution.execute(outgoing, body);
    }
}
```

## Step 6: Add Retries with Istio

Remove Spring Retry:

```xml
<!-- Remove if using only for HTTP retries -->
<dependency>
    <groupId>org.springframework.retry</groupId>
    <artifactId>spring-retry</artifactId>
</dependency>
```

Configure retries in the VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
    - order-service
  http:
    - route:
        - destination:
            host: order-service
      retries:
        attempts: 3
        perTryTimeout: 5s
        retryOn: 5xx,reset,connect-failure
```

## Step 7: Add Timeouts

Remove any `@HystrixProperty` timeout configurations and set them in Istio:

```yaml
  http:
    - route:
        - destination:
            host: order-service
      timeout: 10s
```

## Migration Order

Do the migration in this order to minimize risk:

1. Deploy Istio in PERMISSIVE mode
2. Inject sidecars into all services
3. Verify everything works with both Spring Cloud and Istio
4. Remove Eureka (switch to Kubernetes DNS)
5. Remove Ribbon (Envoy handles load balancing)
6. Replace Zuul with Istio ingress
7. Remove Hystrix, add Istio circuit breaking
8. Remove Sleuth, configure Istio tracing
9. Switch to STRICT mTLS
10. Decommission the Eureka server

Take your time with each step. Run both the Spring Cloud component and the Istio equivalent in parallel when possible, and verify traffic is flowing correctly before removing the old component.

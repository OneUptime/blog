# How to Deploy Spring Cloud Gateway on Kubernetes with Route Predicates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Spring Cloud, API Gateway, Kubernetes

Description: Deploy Spring Cloud Gateway on Kubernetes with comprehensive route predicate configurations including path matching, header-based routing, weight-based traffic splitting, and custom predicates.

---

Spring Cloud Gateway provides a powerful and flexible routing engine built on Spring Framework 5, Project Reactor, and Spring Boot 2. Unlike traditional servlet-based gateways, Spring Cloud Gateway uses non-blocking APIs to handle requests efficiently. Route predicates determine whether a request matches a particular route, enabling sophisticated traffic routing based on virtually any request attribute.

## Why Spring Cloud Gateway

Spring Cloud Gateway fits naturally into Spring-based microservices ecosystems. If your services are already built with Spring Boot, using Spring Cloud Gateway maintains consistency across your stack. The gateway integrates seamlessly with Spring Cloud Discovery (Eureka, Consul) and Spring Cloud Config for dynamic routing and configuration management.

The predicate system is the gateway's standout feature. You can route traffic based on paths, headers, query parameters, cookies, time windows, client IP addresses, or any combination of these factors. This flexibility enables advanced use cases like A/B testing, canary deployments, and tenant isolation.

## Building the Gateway Application

Start by creating a Spring Boot application with the Spring Cloud Gateway dependency.

```xml
<!-- pom.xml -->
<project>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
  </parent>

  <dependencies>
    <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-starter-gateway</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-starter-kubernetes-client-all</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
  </dependencies>

  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-dependencies</artifactId>
        <version>2023.0.0</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>
</project>
```

## Configuring Basic Route Predicates

Spring Cloud Gateway routes are configured in `application.yaml`. Each route has an ID, a destination URI, and one or more predicates.

```yaml
# application.yaml
spring:
  cloud:
    gateway:
      routes:
      - id: user_service
        uri: http://user-service:8080
        predicates:
        - Path=/api/users/**
        filters:
        - StripPrefix=2

      - id: order_service
        uri: http://order-service:8080
        predicates:
        - Path=/api/orders/**
        - Method=GET,POST
        filters:
        - StripPrefix=2

      - id: product_service
        uri: http://product-service:8080
        predicates:
        - Path=/api/products/**
        - Header=X-Request-Type, standard
        filters:
        - StripPrefix=2
```

The `Path` predicate matches request paths using Ant-style patterns. The `StripPrefix=2` filter removes the first two path segments before forwarding to the backend, so `/api/users/123` becomes `/123`.

## Header-Based Routing

Route traffic based on request headers to implement features like API versioning or tenant isolation.

```yaml
spring:
  cloud:
    gateway:
      routes:
      # Route v1 API requests
      - id: api_v1
        uri: http://api-service-v1:8080
        predicates:
        - Path=/api/**
        - Header=X-API-Version, v1
        filters:
        - StripPrefix=1

      # Route v2 API requests
      - id: api_v2
        uri: http://api-service-v2:8080
        predicates:
        - Path=/api/**
        - Header=X-API-Version, v2
        filters:
        - StripPrefix=1

      # Tenant-based routing
      - id: tenant_premium
        uri: http://service-premium:8080
        predicates:
        - Path=/api/**
        - Header=X-Tenant-Tier, premium
        filters:
        - StripPrefix=1

      - id: tenant_standard
        uri: http://service-standard:8080
        predicates:
        - Path=/api/**
        - Header=X-Tenant-Tier, standard
        filters:
        - StripPrefix=1
```

Header predicates support regular expressions for flexible matching:

```yaml
- id: custom_header_route
  uri: http://special-service:8080
  predicates:
  - Path=/api/**
  - Header=X-Custom-Header, \d{3}-\d{2}-\d{4}
```

This routes requests only when the `X-Custom-Header` matches the pattern (like a social security number format).

## Query Parameter Predicates

Route based on query parameters to implement feature flags or debugging modes.

```yaml
spring:
  cloud:
    gateway:
      routes:
      # Debug mode routing
      - id: debug_service
        uri: http://debug-service:8080
        predicates:
        - Path=/api/**
        - Query=debug, true
        filters:
        - StripPrefix=1

      # Feature flag routing
      - id: experimental_features
        uri: http://experimental-service:8080
        predicates:
        - Path=/api/**
        - Query=features, experimental
        filters:
        - StripPrefix=1

      # Version-based routing via query param
      - id: versioned_api
        uri: http://api-service:8080
        predicates:
        - Path=/api/**
        - Query=version, v[2-9]
        filters:
        - StripPrefix=1
```

## Weight-Based Traffic Splitting

Implement canary deployments or A/B testing by splitting traffic between different service versions.

```yaml
spring:
  cloud:
    gateway:
      routes:
      # 90% to stable version
      - id: product_service_stable
        uri: http://product-service-v1:8080
        predicates:
        - Path=/api/products/**
        - Weight=product_group, 90
        filters:
        - StripPrefix=2

      # 10% to canary version
      - id: product_service_canary
        uri: http://product-service-v2:8080
        predicates:
        - Path=/api/products/**
        - Weight=product_group, 10
        filters:
        - StripPrefix=2
```

The `Weight` predicate requires a group name and a weight value. All routes with the same group name share traffic proportionally based on their weights.

## Time-Based Routing

Route traffic based on time windows for scheduled maintenance or business hours routing.

```yaml
spring:
  cloud:
    gateway:
      routes:
      # Business hours routing
      - id: business_hours
        uri: http://primary-service:8080
        predicates:
        - Path=/api/**
        - Between=2026-01-01T09:00:00+00:00, 2026-12-31T17:00:00+00:00
        filters:
        - StripPrefix=1

      # After hours routing to maintenance mode
      - id: after_hours
        uri: http://maintenance-service:8080
        predicates:
        - Path=/api/**
        - After=2026-12-31T17:00:00+00:00
        filters:
        - StripPrefix=1
```

## Custom Route Predicates

Create custom predicates for application-specific routing logic.

```java
// CustomHeaderRoutePredicate.java
@Component
public class CustomHeaderRoutePredicateFactory
    extends AbstractRoutePredicateFactory<CustomHeaderRoutePredicateFactory.Config> {

    public CustomHeaderRoutePredicateFactory() {
        super(Config.class);
    }

    @Override
    public Predicate<ServerWebExchange> apply(Config config) {
        return exchange -> {
            String headerValue = exchange.getRequest()
                .getHeaders()
                .getFirst(config.getHeaderName());

            if (headerValue == null) {
                return false;
            }

            // Custom logic: route if header value is uppercase
            return headerValue.equals(headerValue.toUpperCase());
        };
    }

    public static class Config {
        private String headerName;

        public String getHeaderName() {
            return headerName;
        }

        public void setHeaderName(String headerName) {
            this.headerName = headerName;
        }
    }

    @Override
    public List<String> shortcutFieldOrder() {
        return Arrays.asList("headerName");
    }
}
```

Use the custom predicate in your configuration:

```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: custom_route
        uri: http://special-service:8080
        predicates:
        - Path=/api/**
        - CustomHeader=X-Special-Header
```

## Kubernetes Deployment

Package your gateway as a Docker image and deploy to Kubernetes.

```dockerfile
# Dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/gateway-service-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```yaml
# gateway-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spring-cloud-gateway
  namespace: gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gateway
  template:
    metadata:
      labels:
        app: gateway
    spec:
      containers:
      - name: gateway
        image: your-registry/spring-cloud-gateway:1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: kubernetes
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 20
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: spring-cloud-gateway
  namespace: gateway
spec:
  selector:
    app: gateway
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

## Dynamic Configuration with ConfigMap

Externalize gateway configuration using ConfigMaps for easy updates without rebuilding images.

```yaml
# gateway-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gateway-config
  namespace: gateway
data:
  application.yaml: |
    spring:
      cloud:
        gateway:
          routes:
          - id: user_service
            uri: http://user-service:8080
            predicates:
            - Path=/api/users/**
            filters:
            - StripPrefix=2
```

Mount the ConfigMap in your deployment:

```yaml
spec:
  template:
    spec:
      containers:
      - name: gateway
        volumeMounts:
        - name: config
          mountPath: /config
        env:
        - name: SPRING_CONFIG_LOCATION
          value: file:/config/
      volumes:
      - name: config
        configMap:
          name: gateway-config
```

## Service Discovery Integration

Integrate with Kubernetes service discovery to route dynamically to discovered services.

```yaml
spring:
  cloud:
    gateway:
      discovery:
        locator:
          enabled: true
          lower-case-service-id: true
      routes:
      - id: service_discovery_route
        uri: lb://user-service
        predicates:
        - Path=/users/**
        filters:
        - StripPrefix=1
```

The `lb://` scheme uses Spring Cloud LoadBalancer to discover service instances and distribute requests across them.

## Testing Route Predicates

Verify your route predicates work correctly with integration tests.

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
public class GatewayRoutingTest {

    @Autowired
    private WebTestClient webClient;

    @Test
    public void testPathPredicate() {
        webClient.get()
            .uri("/api/users/123")
            .exchange()
            .expectStatus().isOk();
    }

    @Test
    public void testHeaderPredicate() {
        webClient.get()
            .uri("/api/products")
            .header("X-API-Version", "v2")
            .exchange()
            .expectStatus().isOk();
    }

    @Test
    public void testWeightBasedRouting() {
        // Send 100 requests and verify distribution
        Map<String, Integer> responses = new HashMap<>();
        for (int i = 0; i < 100; i++) {
            String response = webClient.get()
                .uri("/api/products")
                .exchange()
                .expectStatus().isOk()
                .returnResult(String.class)
                .getResponseBody()
                .blockFirst();

            responses.merge(response, 1, Integer::sum);
        }

        // Verify roughly 90/10 split (with tolerance)
        assertTrue(responses.get("v1") > 80);
        assertTrue(responses.get("v2") < 20);
    }
}
```

## Conclusion

Spring Cloud Gateway provides a powerful, flexible routing engine that integrates seamlessly with Spring-based microservices. Route predicates enable sophisticated traffic management based on any request attribute, while filters allow you to transform requests and responses. Deploying on Kubernetes with ConfigMaps enables dynamic configuration updates without service restarts. Whether you need simple path-based routing or complex multi-dimensional traffic splitting, Spring Cloud Gateway's predicate system provides the flexibility to implement your routing requirements.

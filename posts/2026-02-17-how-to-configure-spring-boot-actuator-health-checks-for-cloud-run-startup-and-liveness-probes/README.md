# How to Configure Spring Boot Actuator Health Checks for Cloud Run Startup and Liveness Probes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Spring Boot, Actuator, Health Checks, Kubernetes

Description: Configure Spring Boot Actuator health checks to work with Cloud Run startup and liveness probes for reliable container lifecycle management and zero-downtime deployments.

---

Cloud Run supports startup probes and liveness probes to manage container lifecycle. Startup probes tell Cloud Run when your container is ready to accept traffic. Liveness probes tell Cloud Run when your container has become unhealthy and needs to be restarted. Spring Boot Actuator provides health check endpoints that map perfectly to these probes, but the configuration needs some thought.

In this post, I will show you how to configure Spring Boot Actuator health endpoints for Cloud Run probes, including custom health indicators for your specific dependencies.

## Why Health Probes Matter on Cloud Run

Without probes, Cloud Run assumes your container is healthy as soon as the process starts listening on the configured port. But your Spring Boot application might need several seconds to initialize the application context, connect to databases, and warm up caches. Without a startup probe, Cloud Run could send traffic to a container that is not ready.

Liveness probes catch situations where the container is running but stuck - maybe a thread pool is exhausted, a database connection is dead, or memory is thrashing. Without a liveness probe, a zombie container keeps receiving traffic and failing.

## Adding Actuator

Add the Actuator dependency to your project:

```xml
<!-- Spring Boot Actuator for health endpoints -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

## Configuring Health Endpoints

Spring Boot Actuator provides dedicated endpoints for Kubernetes-style probes. Enable them in `application.properties`:

```properties
# Enable the health endpoint
management.endpoints.web.exposure.include=health

# Enable Kubernetes probe endpoints
management.health.livenessstate.enabled=true
management.health.readinessstate.enabled=true
management.endpoint.health.probes.enabled=true

# Show detailed health information (useful for debugging)
management.endpoint.health.show-details=always

# Configure the management port (optional - can use the same port)
management.server.port=8081

# Health endpoint group configuration
management.endpoint.health.group.liveness.include=livenessState,diskSpace
management.endpoint.health.group.readiness.include=readinessState,db,redis
management.endpoint.health.group.startup.include=readinessState
```

This configuration gives you three health endpoints:

- `/actuator/health/liveness` - for liveness probes
- `/actuator/health/readiness` - for readiness probes (used as startup probe on Cloud Run)
- `/actuator/health` - the main health endpoint with all indicators

## Writing a Custom Health Indicator

The built-in health indicators cover common dependencies like databases and caches. For custom checks, write your own health indicator:

```java
@Component
public class ExternalApiHealthIndicator implements HealthIndicator {

    private final RestTemplate restTemplate;
    private final String apiBaseUrl;

    public ExternalApiHealthIndicator(RestTemplate restTemplate,
                                       @Value("${app.external-api.url}") String apiBaseUrl) {
        this.restTemplate = restTemplate;
        this.apiBaseUrl = apiBaseUrl;
    }

    // Check if the external API dependency is reachable
    @Override
    public Health health() {
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    apiBaseUrl + "/health", String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                return Health.up()
                        .withDetail("url", apiBaseUrl)
                        .withDetail("status", response.getStatusCode().value())
                        .build();
            } else {
                return Health.down()
                        .withDetail("url", apiBaseUrl)
                        .withDetail("status", response.getStatusCode().value())
                        .build();
            }
        } catch (Exception e) {
            return Health.down()
                    .withDetail("url", apiBaseUrl)
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
```

You can also write a health indicator that checks database connectivity beyond what the default one does:

```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseHealthIndicator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // Run a lightweight query to verify database connectivity
    @Override
    public Health health() {
        try {
            long start = System.currentTimeMillis();
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            long elapsed = System.currentTimeMillis() - start;

            if (elapsed > 5000) {
                // Database is responding but very slowly
                return Health.status("DEGRADED")
                        .withDetail("responseTimeMs", elapsed)
                        .withDetail("message", "Database responding slowly")
                        .build();
            }

            return Health.up()
                    .withDetail("responseTimeMs", elapsed)
                    .build();
        } catch (Exception e) {
            return Health.down()
                    .withException(e)
                    .build();
        }
    }
}
```

## Configuring Cloud Run Probes

Deploy your application and configure the probes in your Cloud Run service YAML:

```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-spring-app
spec:
  template:
    metadata:
      annotations:
        # Allow 2 instances minimum to avoid cold starts
        autoscaling.knative.dev/minScale: "1"
    spec:
      containers:
        - image: gcr.io/my-project/my-spring-app:latest
          ports:
            - containerPort: 8080
          resources:
            limits:
              memory: "512Mi"
              cpu: "1"
          # Startup probe - checks if the app has finished initializing
          startupProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8081
            # Wait up to 30 seconds for the app to start
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 6
            timeoutSeconds: 3
          # Liveness probe - checks if the app is still healthy
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8081
            # Check every 30 seconds after the startup probe succeeds
            initialDelaySeconds: 0
            periodSeconds: 30
            failureThreshold: 3
            timeoutSeconds: 5
```

You can also configure probes using the gcloud CLI:

```bash
# Deploy with startup and liveness probes
gcloud run deploy my-spring-app \
    --image gcr.io/my-project/my-spring-app:latest \
    --port 8080 \
    --startup-probe "httpGet.path=/actuator/health/readiness,httpGet.port=8081,initialDelaySeconds=5,periodSeconds=5,failureThreshold=6" \
    --liveness-probe "httpGet.path=/actuator/health/liveness,httpGet.port=8081,periodSeconds=30,failureThreshold=3" \
    --region us-central1
```

## Separating Management and Application Ports

Running the Actuator endpoints on a separate port is a good practice. It keeps health check traffic separate from application traffic and lets you restrict access to management endpoints.

```properties
# Application runs on port 8080
server.port=8080

# Actuator runs on port 8081
management.server.port=8081

# Only expose health endpoint on the management port
management.endpoints.web.exposure.include=health
```

Cloud Run can probe both ports, so this separation works well.

## Health Check Response Times

Your health checks should be fast. Cloud Run probes have timeouts, and a slow health check can cause false negatives. Avoid making expensive calls in your health indicators.

If you need to check an external service that might be slow, consider caching the health status:

```java
@Component
public class CachedExternalHealthIndicator implements HealthIndicator {

    private volatile Health cachedHealth = Health.unknown().build();
    private final ExternalServiceClient client;

    public CachedExternalHealthIndicator(ExternalServiceClient client) {
        this.client = client;
    }

    // Refresh the cached health status every 30 seconds in the background
    @Scheduled(fixedRate = 30000)
    public void refreshHealth() {
        try {
            boolean healthy = client.ping();
            cachedHealth = healthy ? Health.up().build() : Health.down().build();
        } catch (Exception e) {
            cachedHealth = Health.down().withException(e).build();
        }
    }

    // Return the cached status instantly - no blocking on external calls
    @Override
    public Health health() {
        return cachedHealth;
    }
}
```

## Graceful Shutdown

Pair health checks with graceful shutdown so in-flight requests complete before the container stops:

```properties
# Enable graceful shutdown
server.shutdown=graceful

# Wait up to 30 seconds for in-flight requests to complete
spring.lifecycle.timeout-per-shutdown-phase=30s
```

When Cloud Run sends a SIGTERM signal, Spring Boot will stop accepting new requests, wait for in-flight requests to finish (up to 30 seconds), and then shut down.

## Wrapping Up

Spring Boot Actuator health endpoints map naturally to Cloud Run startup and liveness probes. Enable the Kubernetes probe endpoints, write custom health indicators for your specific dependencies, and configure the probes in your Cloud Run deployment. Keep health checks fast, use a separate management port, and enable graceful shutdown. This gives Cloud Run the signals it needs to route traffic only to healthy containers and restart containers that have become stuck.

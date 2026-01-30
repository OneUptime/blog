# How to Implement Custom Actuator Endpoints

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring Boot, Actuator, Monitoring

Description: Create custom Spring Boot Actuator endpoints for application-specific health checks, metrics, and operational information exposure.

---

Spring Boot Actuator provides production-ready features for monitoring and managing your application. While the built-in endpoints cover most common scenarios, you will often need custom endpoints tailored to your specific business requirements. This guide walks through creating custom Actuator endpoints from scratch.

## Prerequisites

Before diving in, make sure you have the Actuator dependency in your project.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

For Gradle users:

```groovy
implementation 'org.springframework.boot:spring-boot-starter-actuator'
```

## Understanding Actuator Endpoint Types

Spring Boot Actuator supports three types of endpoint exposure:

| Type | Description | Access Method |
|------|-------------|---------------|
| Web | Exposed over HTTP | REST API calls |
| JMX | Exposed via Java Management Extensions | JMX clients like JConsole |
| Both | Available through web and JMX | Either method |

By default, most endpoints are exposed over JMX but not over the web. You control this through configuration:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,custom-endpoint
    jmx:
      exposure:
        include: "*"
```

## Creating Your First Custom Endpoint

The `@Endpoint` annotation marks a class as an Actuator endpoint. Combined with operation annotations, you define what the endpoint does.

### Basic Endpoint Structure

This example creates an endpoint that returns application feature flags:

```java
package com.example.actuator;

import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Custom endpoint exposing feature flag status.
 * Accessible at /actuator/features
 */
@Component
@Endpoint(id = "features")
public class FeatureFlagsEndpoint {

    private final FeatureFlagService featureFlagService;

    public FeatureFlagsEndpoint(FeatureFlagService featureFlagService) {
        this.featureFlagService = featureFlagService;
    }

    // GET request to /actuator/features
    @ReadOperation
    public Map<String, Object> features() {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", System.currentTimeMillis());
        response.put("flags", featureFlagService.getAllFlags());
        response.put("environment", featureFlagService.getEnvironment());
        return response;
    }
}
```

The endpoint ID becomes part of the URL path. With `id = "features"`, the endpoint is accessible at `/actuator/features`.

## Operation Annotations Explained

Actuator endpoints support three operation types that map to HTTP methods:

| Annotation | HTTP Method | Purpose |
|------------|-------------|---------|
| `@ReadOperation` | GET | Retrieve information |
| `@WriteOperation` | POST | Modify state or trigger actions |
| `@DeleteOperation` | DELETE | Remove or reset something |

### Read Operations with Parameters

You can pass parameters to read operations through query strings or path segments.

```java
package com.example.actuator;

import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.boot.actuate.endpoint.annotation.Selector;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Endpoint(id = "cache-stats")
public class CacheStatisticsEndpoint {

    private final CacheManager cacheManager;

    public CacheStatisticsEndpoint(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    // GET /actuator/cache-stats
    // Returns statistics for all caches
    @ReadOperation
    public Map<String, CacheStatistics> allCacheStats() {
        return cacheManager.getAllStatistics();
    }

    // GET /actuator/cache-stats/{cacheName}
    // The @Selector annotation captures the path variable
    @ReadOperation
    public CacheStatistics cacheStats(@Selector String cacheName) {
        CacheStatistics stats = cacheManager.getStatistics(cacheName);
        if (stats == null) {
            // Returning null results in a 404 response
            return null;
        }
        return stats;
    }

    // GET /actuator/cache-stats?region=us-east
    // Query parameters are passed as method arguments
    @ReadOperation
    public Map<String, CacheStatistics> cacheStatsByRegion(
            @Nullable String region) {
        if (region == null) {
            return cacheManager.getAllStatistics();
        }
        return cacheManager.getStatisticsByRegion(region);
    }
}
```

### Write Operations for State Changes

Write operations let you modify application state or trigger actions through POST requests.

```java
package com.example.actuator;

import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.boot.actuate.endpoint.annotation.WriteOperation;
import org.springframework.boot.actuate.endpoint.annotation.Selector;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Endpoint(id = "circuit-breakers")
public class CircuitBreakerEndpoint {

    private final CircuitBreakerRegistry registry;

    public CircuitBreakerEndpoint(CircuitBreakerRegistry registry) {
        this.registry = registry;
    }

    // GET /actuator/circuit-breakers
    @ReadOperation
    public Map<String, CircuitBreakerStatus> getAllCircuitBreakers() {
        Map<String, CircuitBreakerStatus> statuses = new ConcurrentHashMap<>();
        registry.getAllCircuitBreakers().forEach(cb ->
            statuses.put(cb.getName(), new CircuitBreakerStatus(
                cb.getState(),
                cb.getMetrics().getFailureRate(),
                cb.getMetrics().getNumberOfSuccessfulCalls(),
                cb.getMetrics().getNumberOfFailedCalls()
            ))
        );
        return statuses;
    }

    // POST /actuator/circuit-breakers/{name}
    // Request body: {"action": "reset"} or {"action": "disable"}
    @WriteOperation
    public CircuitBreakerStatus updateCircuitBreaker(
            @Selector String name,
            String action) {

        CircuitBreaker cb = registry.getCircuitBreaker(name);
        if (cb == null) {
            throw new IllegalArgumentException(
                "Circuit breaker not found: " + name);
        }

        switch (action.toLowerCase()) {
            case "reset":
                cb.reset();
                break;
            case "disable":
                cb.transitionToDisabledState();
                break;
            case "force-open":
                cb.transitionToForcedOpenState();
                break;
            case "close":
                cb.transitionToClosedState();
                break;
            default:
                throw new IllegalArgumentException(
                    "Unknown action: " + action);
        }

        return new CircuitBreakerStatus(
            cb.getState(),
            cb.getMetrics().getFailureRate(),
            cb.getMetrics().getNumberOfSuccessfulCalls(),
            cb.getMetrics().getNumberOfFailedCalls()
        );
    }
}

// Supporting record for the response
record CircuitBreakerStatus(
    String state,
    float failureRate,
    long successfulCalls,
    long failedCalls
) {}
```

### Delete Operations

Delete operations handle cleanup or reset functionality.

```java
package com.example.actuator;

import org.springframework.boot.actuate.endpoint.annotation.DeleteOperation;
import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.Selector;
import org.springframework.stereotype.Component;

@Component
@Endpoint(id = "temp-files")
public class TempFilesEndpoint {

    private final TempFileManager tempFileManager;

    public TempFilesEndpoint(TempFileManager tempFileManager) {
        this.tempFileManager = tempFileManager;
    }

    // DELETE /actuator/temp-files
    // Clears all temporary files
    @DeleteOperation
    public Map<String, Object> clearAllTempFiles() {
        int deletedCount = tempFileManager.clearAll();
        return Map.of(
            "deleted", deletedCount,
            "timestamp", System.currentTimeMillis()
        );
    }

    // DELETE /actuator/temp-files/{category}
    // Clears temporary files in a specific category
    @DeleteOperation
    public Map<String, Object> clearTempFilesByCategory(
            @Selector String category) {
        int deletedCount = tempFileManager.clearByCategory(category);
        return Map.of(
            "category", category,
            "deleted", deletedCount,
            "timestamp", System.currentTimeMillis()
        );
    }
}
```

## Web-Specific Endpoints

Sometimes you need access to the underlying HTTP request and response objects. The `@WebEndpoint` annotation creates endpoints that only work over HTTP.

```java
package com.example.actuator;

import org.springframework.boot.actuate.endpoint.web.annotation.WebEndpoint;
import org.springframework.boot.actuate.endpoint.web.annotation.RestControllerEndpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Web-only endpoint with full Spring MVC support.
 * Use this when you need ResponseEntity, request headers, or other web features.
 */
@Component
@RestControllerEndpoint(id = "api-docs")
public class ApiDocumentationEndpoint {

    private final DocumentationService documentationService;

    public ApiDocumentationEndpoint(DocumentationService documentationService) {
        this.documentationService = documentationService;
    }

    // GET /actuator/api-docs
    @GetMapping
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getDocumentation(
            HttpServletRequest request) {

        String baseUrl = request.getRequestURL().toString()
            .replace(request.getRequestURI(), "");

        Map<String, Object> docs = new HashMap<>();
        docs.put("baseUrl", baseUrl);
        docs.put("version", documentationService.getVersion());
        docs.put("endpoints", documentationService.getEndpoints());

        return ResponseEntity.ok()
            .header("X-Documentation-Version",
                documentationService.getVersion())
            .body(docs);
    }

    // GET /actuator/api-docs/{section}
    @GetMapping("/{section}")
    @ResponseBody
    public ResponseEntity<Object> getSection(
            @PathVariable String section) {

        Object sectionDocs = documentationService.getSection(section);

        if (sectionDocs == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of(
                    "error", "Section not found",
                    "section", section,
                    "availableSections",
                        documentationService.getAvailableSections()
                ));
        }

        return ResponseEntity.ok(sectionDocs);
    }
}
```

### Servlet-Specific Endpoint Extension

You can extend a base endpoint with servlet-specific functionality:

```java
package com.example.actuator;

import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.boot.actuate.endpoint.web.WebEndpointResponse;
import org.springframework.boot.actuate.endpoint.web.annotation.EndpointWebExtension;
import org.springframework.stereotype.Component;

import java.util.Map;

// Base endpoint available over both JMX and web
@Component
@Endpoint(id = "build-info")
public class BuildInfoEndpoint {

    @ReadOperation
    public Map<String, String> buildInfo() {
        return Map.of(
            "version", "1.2.3",
            "buildTime", "2026-01-30T10:00:00Z",
            "gitCommit", "abc123"
        );
    }
}

// Web extension that adds HTTP-specific features
@Component
@EndpointWebExtension(endpoint = BuildInfoEndpoint.class)
public class BuildInfoWebExtension {

    private final BuildInfoEndpoint delegate;

    public BuildInfoWebExtension(BuildInfoEndpoint delegate) {
        this.delegate = delegate;
    }

    @ReadOperation
    public WebEndpointResponse<Map<String, String>> buildInfo() {
        Map<String, String> info = delegate.buildInfo();

        // Return with custom HTTP status and headers
        return new WebEndpointResponse<>(info, 200);
    }
}
```

## Custom Health Indicators

Health indicators contribute to the `/actuator/health` endpoint. They are the standard way to expose component health status.

### Basic Health Indicator

```java
package com.example.actuator.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * Health indicator for external payment gateway.
 * Contributes to /actuator/health with key "paymentGateway"
 */
@Component
public class PaymentGatewayHealthIndicator implements HealthIndicator {

    private final PaymentGatewayClient gatewayClient;

    public PaymentGatewayHealthIndicator(PaymentGatewayClient gatewayClient) {
        this.gatewayClient = gatewayClient;
    }

    @Override
    public Health health() {
        try {
            long startTime = System.currentTimeMillis();
            boolean reachable = gatewayClient.ping();
            long responseTime = System.currentTimeMillis() - startTime;

            if (reachable) {
                return Health.up()
                    .withDetail("responseTime", responseTime + "ms")
                    .withDetail("gateway", gatewayClient.getGatewayUrl())
                    .withDetail("lastChecked", System.currentTimeMillis())
                    .build();
            } else {
                return Health.down()
                    .withDetail("reason", "Gateway unreachable")
                    .withDetail("gateway", gatewayClient.getGatewayUrl())
                    .build();
            }
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .withDetail("errorType", e.getClass().getSimpleName())
                .build();
        }
    }
}
```

### Reactive Health Indicator

For reactive applications, implement `ReactiveHealthIndicator`:

```java
package com.example.actuator.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.ReactiveHealthIndicator;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Component
public class ExternalApiHealthIndicator implements ReactiveHealthIndicator {

    private final WebClient webClient;
    private final String healthCheckUrl;

    public ExternalApiHealthIndicator(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
        this.healthCheckUrl = "https://api.external-service.com/health";
    }

    @Override
    public Mono<Health> health() {
        return webClient.get()
            .uri(healthCheckUrl)
            .retrieve()
            .bodyToMono(String.class)
            .timeout(Duration.ofSeconds(5))
            .map(response -> Health.up()
                .withDetail("response", response)
                .build())
            .onErrorResume(ex -> Mono.just(
                Health.down()
                    .withDetail("error", ex.getMessage())
                    .build()
            ));
    }
}
```

### Composite Health Indicator

Group related health checks together:

```java
package com.example.actuator.health;

import org.springframework.boot.actuate.health.CompositeHealthContributor;
import org.springframework.boot.actuate.health.HealthContributor;
import org.springframework.boot.actuate.health.NamedContributor;
import org.springframework.stereotype.Component;

import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Groups all database-related health indicators under "databases"
 * Result: /actuator/health shows databases.primary, databases.replica, etc.
 */
@Component("databases")
public class DatabaseHealthContributor implements CompositeHealthContributor {

    private final Map<String, HealthContributor> contributors;

    public DatabaseHealthContributor(
            PrimaryDatabaseHealthIndicator primary,
            ReplicaDatabaseHealthIndicator replica,
            CacheDatabaseHealthIndicator cache) {

        this.contributors = new LinkedHashMap<>();
        contributors.put("primary", primary);
        contributors.put("replica", replica);
        contributors.put("cache", cache);
    }

    @Override
    public HealthContributor getContributor(String name) {
        return contributors.get(name);
    }

    @Override
    public Iterator<NamedContributor<HealthContributor>> iterator() {
        return contributors.entrySet().stream()
            .map(entry -> NamedContributor.of(
                entry.getKey(),
                entry.getValue()))
            .iterator();
    }
}
```

## Endpoint Caching

Endpoint responses can be cached to reduce load on expensive operations.

### Time-Based Caching

Configure caching in your application properties:

```yaml
management:
  endpoint:
    health:
      cache:
        time-to-live: 10s
    # Custom endpoint caching
    features:
      cache:
        time-to-live: 30s
    cache-stats:
      cache:
        time-to-live: 5s
```

### Programmatic Cache Control

For more control, implement caching in the endpoint itself:

```java
package com.example.actuator;

import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@Component
@Endpoint(id = "system-metrics")
public class SystemMetricsEndpoint {

    private final MetricsCollector metricsCollector;
    private final Duration cacheDuration = Duration.ofSeconds(15);
    private final AtomicReference<CachedMetrics> cachedMetrics =
        new AtomicReference<>();

    public SystemMetricsEndpoint(MetricsCollector metricsCollector) {
        this.metricsCollector = metricsCollector;
    }

    @ReadOperation
    public Map<String, Object> metrics() {
        CachedMetrics cached = cachedMetrics.get();
        Instant now = Instant.now();

        // Check if cache is valid
        if (cached != null &&
            cached.timestamp().plus(cacheDuration).isAfter(now)) {
            return cached.metrics();
        }

        // Collect fresh metrics
        Map<String, Object> freshMetrics = collectMetrics();
        cachedMetrics.set(new CachedMetrics(now, freshMetrics));

        return freshMetrics;
    }

    private Map<String, Object> collectMetrics() {
        return Map.of(
            "cpu", metricsCollector.getCpuUsage(),
            "memory", metricsCollector.getMemoryUsage(),
            "threads", metricsCollector.getThreadCount(),
            "openFiles", metricsCollector.getOpenFileDescriptors(),
            "collectedAt", Instant.now().toString()
        );
    }

    private record CachedMetrics(
        Instant timestamp,
        Map<String, Object> metrics
    ) {}
}
```

## Securing Custom Endpoints

Security is critical for Actuator endpoints, especially write and delete operations.

### Spring Security Configuration

```java
package com.example.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class ActuatorSecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                // Health and info are publicly accessible
                .requestMatchers("/actuator/health/**").permitAll()
                .requestMatchers("/actuator/info").permitAll()

                // Read-only endpoints require USER role
                .requestMatchers("/actuator/metrics/**").hasRole("USER")
                .requestMatchers("/actuator/features").hasRole("USER")
                .requestMatchers("/actuator/cache-stats/**").hasRole("USER")

                // Write/delete operations require ADMIN role
                .requestMatchers("/actuator/circuit-breakers/**")
                    .hasRole("ADMIN")
                .requestMatchers("/actuator/temp-files/**").hasRole("ADMIN")

                // All other actuator endpoints require ADMIN
                .requestMatchers("/actuator/**").hasRole("ADMIN")

                // Application endpoints
                .anyRequest().authenticated()
            )
            .httpBasic(httpBasic -> {})
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/actuator/**")
            );

        return http.build();
    }
}
```

### Method-Level Security

Add security directly to endpoint methods:

```java
package com.example.actuator;

import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.boot.actuate.endpoint.annotation.WriteOperation;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Component;

@Component
@Endpoint(id = "config-manager")
public class ConfigManagerEndpoint {

    private final ConfigurationService configService;

    public ConfigManagerEndpoint(ConfigurationService configService) {
        this.configService = configService;
    }

    @ReadOperation
    @PreAuthorize("hasRole('USER')")
    public Map<String, String> getConfiguration() {
        return configService.getAllConfigs();
    }

    @WriteOperation
    @PreAuthorize("hasRole('ADMIN') and #key != 'security.secret'")
    public Map<String, Object> updateConfiguration(
            String key,
            String value) {

        String oldValue = configService.getConfig(key);
        configService.setConfig(key, value);

        return Map.of(
            "key", key,
            "oldValue", oldValue,
            "newValue", value,
            "updatedAt", System.currentTimeMillis()
        );
    }
}
```

## Complete Example: Application Status Dashboard

Here is a comprehensive endpoint that combines multiple features:

```java
package com.example.actuator;

import org.springframework.boot.actuate.endpoint.annotation.DeleteOperation;
import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.boot.actuate.endpoint.annotation.Selector;
import org.springframework.boot.actuate.endpoint.annotation.WriteOperation;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.Status;
import org.springframework.stereotype.Component;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.RuntimeMXBean;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Comprehensive application status endpoint.
 * Provides overview, component status, and operational controls.
 */
@Component
@Endpoint(id = "app-status")
public class ApplicationStatusEndpoint {

    private final HealthEndpoint healthEndpoint;
    private final RuntimeMXBean runtimeMXBean;
    private final MemoryMXBean memoryMXBean;
    private final List<MaintenanceEvent> maintenanceLog;
    private volatile boolean maintenanceMode = false;

    public ApplicationStatusEndpoint(HealthEndpoint healthEndpoint) {
        this.healthEndpoint = healthEndpoint;
        this.runtimeMXBean = ManagementFactory.getRuntimeMXBean();
        this.memoryMXBean = ManagementFactory.getMemoryMXBean();
        this.maintenanceLog = new CopyOnWriteArrayList<>();
    }

    /**
     * GET /actuator/app-status
     * Returns complete application status overview
     */
    @ReadOperation
    public Map<String, Object> getStatus() {
        Map<String, Object> status = new LinkedHashMap<>();

        // Basic info
        status.put("applicationName", "My Application");
        status.put("version", getClass().getPackage()
            .getImplementationVersion());
        status.put("timestamp", Instant.now().toString());
        status.put("maintenanceMode", maintenanceMode);

        // Health status
        Status healthStatus = healthEndpoint.health().getStatus();
        status.put("health", healthStatus.getCode());

        // Uptime information
        long uptimeMillis = runtimeMXBean.getUptime();
        Duration uptime = Duration.ofMillis(uptimeMillis);
        status.put("uptime", Map.of(
            "days", uptime.toDays(),
            "hours", uptime.toHoursPart(),
            "minutes", uptime.toMinutesPart(),
            "seconds", uptime.toSecondsPart(),
            "formatted", formatDuration(uptime)
        ));

        // Memory information
        long heapUsed = memoryMXBean.getHeapMemoryUsage().getUsed();
        long heapMax = memoryMXBean.getHeapMemoryUsage().getMax();
        status.put("memory", Map.of(
            "heapUsed", formatBytes(heapUsed),
            "heapMax", formatBytes(heapMax),
            "heapUsagePercent",
                String.format("%.1f%%", (heapUsed * 100.0) / heapMax)
        ));

        // JVM information
        status.put("jvm", Map.of(
            "name", runtimeMXBean.getVmName(),
            "version", runtimeMXBean.getVmVersion(),
            "vendor", runtimeMXBean.getVmVendor()
        ));

        return status;
    }

    /**
     * GET /actuator/app-status/{component}
     * Returns status for a specific component
     */
    @ReadOperation
    public Map<String, Object> getComponentStatus(
            @Selector String component) {

        Map<String, Object> componentStatus = new HashMap<>();
        componentStatus.put("component", component);
        componentStatus.put("timestamp", Instant.now().toString());

        switch (component.toLowerCase()) {
            case "memory":
                componentStatus.put("heap",
                    memoryMXBean.getHeapMemoryUsage());
                componentStatus.put("nonHeap",
                    memoryMXBean.getNonHeapMemoryUsage());
                break;
            case "threads":
                componentStatus.put("count",
                    Thread.activeCount());
                componentStatus.put("peakCount",
                    ManagementFactory.getThreadMXBean().getPeakThreadCount());
                break;
            case "maintenance":
                componentStatus.put("enabled", maintenanceMode);
                componentStatus.put("recentEvents",
                    maintenanceLog.stream()
                        .limit(10)
                        .toList());
                break;
            default:
                return null; // Returns 404
        }

        return componentStatus;
    }

    /**
     * POST /actuator/app-status
     * Enable or disable maintenance mode
     * Body: {"maintenance": true, "reason": "Scheduled update"}
     */
    @WriteOperation
    public Map<String, Object> setMaintenanceMode(
            boolean maintenance,
            String reason) {

        boolean previousState = this.maintenanceMode;
        this.maintenanceMode = maintenance;

        MaintenanceEvent event = new MaintenanceEvent(
            Instant.now(),
            maintenance ? "ENABLED" : "DISABLED",
            reason
        );
        maintenanceLog.add(0, event);

        // Keep only last 100 events
        while (maintenanceLog.size() > 100) {
            maintenanceLog.remove(maintenanceLog.size() - 1);
        }

        return Map.of(
            "previousState", previousState,
            "currentState", maintenance,
            "reason", reason,
            "timestamp", event.timestamp().toString()
        );
    }

    /**
     * DELETE /actuator/app-status/maintenance-log
     * Clear the maintenance event log
     */
    @DeleteOperation
    public Map<String, Object> clearMaintenanceLog(
            @Selector String target) {

        if (!"maintenance-log".equals(target)) {
            return null; // 404 for unknown targets
        }

        int clearedCount = maintenanceLog.size();
        maintenanceLog.clear();

        return Map.of(
            "cleared", clearedCount,
            "timestamp", Instant.now().toString()
        );
    }

    private String formatDuration(Duration duration) {
        return String.format("%dd %dh %dm %ds",
            duration.toDays(),
            duration.toHoursPart(),
            duration.toMinutesPart(),
            duration.toSecondsPart());
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        String pre = "KMGTPE".charAt(exp - 1) + "B";
        return String.format("%.1f %s", bytes / Math.pow(1024, exp), pre);
    }

    private record MaintenanceEvent(
        Instant timestamp,
        String action,
        String reason
    ) {}
}
```

## Configuration Reference

Common configuration options for custom endpoints:

```yaml
management:
  # Base path for all actuator endpoints
  endpoints:
    web:
      base-path: /actuator
      exposure:
        include: health,info,metrics,app-status,features
        exclude: shutdown
    jmx:
      exposure:
        include: "*"

  # Endpoint-specific settings
  endpoint:
    health:
      show-details: when-authorized
      show-components: when-authorized
      roles: ADMIN,HEALTH_READER
      cache:
        time-to-live: 10s

    app-status:
      enabled: true
      cache:
        time-to-live: 5s

    features:
      enabled: true

  # Health indicator settings
  health:
    defaults:
      enabled: true
    db:
      enabled: true
    diskspace:
      enabled: true
      threshold: 10MB

  # Server configuration (separate port for actuator)
  server:
    port: 8081
    ssl:
      enabled: true
```

## Testing Custom Endpoints

Write tests to verify your endpoints work correctly:

```java
package com.example.actuator;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ApplicationStatusEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getStatus_ReturnsApplicationStatus() throws Exception {
        mockMvc.perform(get("/actuator/app-status"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.applicationName").exists())
            .andExpect(jsonPath("$.health").exists())
            .andExpect(jsonPath("$.uptime").exists())
            .andExpect(jsonPath("$.memory").exists());
    }

    @Test
    void getComponentStatus_ReturnsMemoryDetails() throws Exception {
        mockMvc.perform(get("/actuator/app-status/memory"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.component").value("memory"))
            .andExpect(jsonPath("$.heap").exists());
    }

    @Test
    void getComponentStatus_Returns404ForUnknown() throws Exception {
        mockMvc.perform(get("/actuator/app-status/unknown"))
            .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void setMaintenanceMode_UpdatesState() throws Exception {
        mockMvc.perform(post("/actuator/app-status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"maintenance\": true, " +
                    "\"reason\": \"Testing\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.currentState").value(true))
            .andExpect(jsonPath("$.reason").value("Testing"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void setMaintenanceMode_Forbidden_ForNonAdmin() throws Exception {
        mockMvc.perform(post("/actuator/app-status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"maintenance\": true, " +
                    "\"reason\": \"Testing\"}"))
            .andExpect(status().isForbidden());
    }
}
```

## Summary

Custom Actuator endpoints give you the flexibility to expose application-specific operational data and controls. Key takeaways:

1. Use `@Endpoint` for technology-agnostic endpoints that work over both web and JMX
2. Use `@RestControllerEndpoint` when you need full Spring MVC features
3. Implement `HealthIndicator` for custom health checks that integrate with the standard health endpoint
4. Configure endpoint caching for expensive operations
5. Secure sensitive endpoints with Spring Security
6. Write tests to ensure endpoints behave correctly under different conditions

The examples in this guide provide a solid foundation for building production-ready monitoring and management capabilities into your Spring Boot applications.

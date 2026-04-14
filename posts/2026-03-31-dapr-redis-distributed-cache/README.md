# How to Implement Distributed Cache with Dapr Redis State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, Distributed Cache, State Management, Microservice

Description: Learn how to implement a distributed cache across multiple microservice instances using Dapr's Redis state store for consistent, shared caching.

---

## Why Distributed Cache Matters

When multiple instances of a microservice run in parallel, an in-process cache (like an in-memory dictionary) means each instance has its own independent copy of the data. A cache miss in instance A is invisible to instance B. A distributed cache - backed by Redis through Dapr - gives all instances access to the same shared cache, dramatically improving hit rates.

## Configuring Redis as a Dapr State Store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: distributed-cache
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-cluster:6379
  - name: redisPassword
    secretKeyRef:
      name: redisPassword
      key: redisPassword
  - name: enableTLS
    value: "true"
  - name: maxRetries
    value: "3"
  - name: maxRetryBackoff
    value: "2s"
auth:
  secretStore: kubernetes
```

## Shared Cache Implementation in Java

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.domain.State;
import io.dapr.client.domain.StateOptions;
import java.time.Duration;
import java.util.Map;

@Service
public class DistributedCacheService {

    private final DaprClient daprClient = new DaprClientBuilder().build();
    private static final String CACHE_STORE = "distributed-cache";

    public <T> T get(String key, Class<T> type) {
        State<T> state = daprClient
            .getState(CACHE_STORE, key, type)
            .block(Duration.ofSeconds(2));
        return state != null ? state.getValue() : null;
    }

    public void set(String key, Object value, int ttlSeconds) {
        StateOptions options = new StateOptions(
            null,
            StateOptions.Concurrency.LAST_WRITE
        );
        Map<String, String> metadata = Map.of("ttlInSeconds", String.valueOf(ttlSeconds));
        daprClient.saveState(CACHE_STORE, key, null, value, metadata, options)
            .block(Duration.ofSeconds(2));
    }

    public void delete(String key) {
        daprClient.deleteState(CACHE_STORE, key).block(Duration.ofSeconds(2));
    }
}
```

## Session Cache Across Multiple Instances

Storing user sessions in the distributed cache enables sticky-session-free deployments:

```java
@RestController
public class SessionController {

    @Autowired
    private DistributedCacheService cache;

    @PostMapping("/sessions")
    public ResponseEntity<Map<String, String>> createSession(@RequestBody LoginRequest req) {
        String sessionId = UUID.randomUUID().toString();
        Map<String, Object> sessionData = Map.of(
            "userId", req.getUserId(),
            "createdAt", Instant.now().toString()
        );
        cache.set("session:" + sessionId, sessionData, 3600);
        return ResponseEntity.ok(Map.of("sessionId", sessionId));
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<Object> getSession(@PathVariable String sessionId) {
        Object session = cache.get("session:" + sessionId, Object.class);
        if (session == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(session);
    }
}
```

Any instance can serve any session because all instances share the same Redis-backed cache through Dapr.

## Multi-Key Operations with Bulk State API

Read or write multiple cache entries in a single request using the bulk state API:

```bash
curl -X POST http://localhost:3500/v1.0/state/distributed-cache/bulk \
  -H "Content-Type: application/json" \
  -d '{"keys": ["product:1", "product:2", "product:3"]}'
```

This reduces network round trips when warming up or hydrating multiple related entities.

## Monitoring Redis Cache Health via Dapr

Check sidecar health and cache component status:

```bash
curl http://localhost:3500/v1.0/healthz/outbound
```

Use Dapr's Prometheus metrics to track state operation latency and error rates:

```bash
curl http://localhost:9090/metrics | grep dapr_component_state
```

## Summary

Dapr's Redis state store provides a production-ready distributed cache that all microservice instances share. By routing cache operations through the Dapr sidecar instead of connecting directly to Redis, each service gets built-in retries, circuit breaking, and mTLS without any extra configuration in the application code.

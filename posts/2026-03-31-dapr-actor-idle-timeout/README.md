# How to Configure Actor Idle Timeout in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Idle Timeout, Configuration, Memory Management

Description: Configure Dapr actor idle timeout to control how long inactive actor instances remain in memory before deactivation, balancing memory use and reactivation latency.

---

The actor idle timeout is one of the most important tuning parameters in Dapr's actor runtime. It determines how long an actor instance remains active in memory without receiving any method calls before Dapr deactivates and removes it.

## What Happens When Idle Timeout Expires

When an actor has not received a method call for longer than `actorIdleTimeout`:
1. Dapr's scanner marks the actor as idle on the next scan.
2. `OnDeactivate` is called to allow cleanup.
3. The in-memory actor instance is removed.
4. Persistent state in the state store remains intact.
5. The next call to that actor ID will reactivate it by loading state from the store.

## Configuring Idle Timeout via the Config Endpoint

Return the configuration from your app's `/dapr/config` endpoint:

```go
// main.go
http.HandleFunc("/dapr/config", func(w http.ResponseWriter, r *http.Request) {
  config := map[string]interface{}{
    "entities":          []string{"UserSession", "Counter"},
    "actorIdleTimeout":  "30m",
    "actorScanInterval": "60s",
  }
  w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(config)
})
```

## Duration Format

Dapr uses Go duration strings:

```text
"30s"    // 30 seconds
"15m"    // 15 minutes
"2h"     // 2 hours
"24h"    // 24 hours
"168h"   // 7 days
```

## Choosing the Right Idle Timeout

**Short timeout (5-30 minutes):**
- Session actors, temporary computations
- Benefit: Low memory footprint
- Cost: Reactivation latency on return visits

**Medium timeout (1-8 hours):**
- Shopping carts, user preferences, game state
- Good balance for most workloads

**Long timeout (24h+):**
- IoT device twins, workflow state, long-running processes
- Benefit: No reactivation overhead
- Cost: Higher memory usage per host

## Monitoring the Impact of Idle Timeout

```bash
# Track deactivation rate
curl http://localhost:9090/metrics | grep dapr_runtime_actor_deactivated_total

# Check pending actor calls
curl http://localhost:9090/metrics | grep dapr_runtime_actor_pending_actor_calls
```

Prometheus query to track actor deactivation rate over time:

```promql
rate(dapr_runtime_actor_deactivated_total{app_id="my-service"}[5m])
```

## Per-Actor-Type Idle Timeout

If you have multiple actor types with different timeout needs, configure them separately using the advanced configuration format:

```go
http.HandleFunc("/dapr/config", func(w http.ResponseWriter, r *http.Request) {
  config := map[string]interface{}{
    "entities": []string{"UserSession", "DeviceTwin"},
    "entitiesConfig": []map[string]interface{}{
      {
        "entities":         []string{"UserSession"},
        "actorIdleTimeout": "30m",
      },
      {
        "entities":         []string{"DeviceTwin"},
        "actorIdleTimeout": "48h",
      },
    },
  }
  json.NewEncoder(w).Encode(config)
})
```

## Summary

Actor idle timeout controls the trade-off between memory efficiency and reactivation latency in Dapr actor deployments. Short timeouts free memory quickly but increase state store reads on reactivation, while long timeouts keep actors warm at the cost of higher memory usage. Use per-entity-type configuration when your app hosts actor types with significantly different access patterns.

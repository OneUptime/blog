# How to Configure Actor Scan Interval in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Scan Interval, Configuration, Performance

Description: Configure the Dapr actor scan interval to control how frequently the runtime checks for idle actors to deactivate, balancing collection responsiveness against CPU overhead.

---

The actor scan interval determines how often Dapr scans the list of active actors on a host instance to find ones that have exceeded their idle timeout. It is distinct from `actorIdleTimeout` - the idle timeout is the threshold, while the scan interval is the frequency of checking that threshold.

## Scan Interval vs Idle Timeout

These two settings work together:

```yaml
actorIdleTimeout:  "1h"    <- How long before an actor is eligible for deactivation
actorScanInterval: "30s"   <- How often Dapr checks for eligible actors
```

The actual deactivation time falls between `actorIdleTimeout` and `actorIdleTimeout + actorScanInterval`.

With the above settings, actors deactivate between 1 hour and 1 hour 30 seconds after their last method call.

## Configuring the Scan Interval

```go
http.HandleFunc("/dapr/config", func(w http.ResponseWriter, r *http.Request) {
  config := map[string]interface{}{
    "entities":          []string{"Counter"},
    "actorIdleTimeout":  "1h",
    "actorScanInterval": "30s",
  }
  w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(config)
})
```

## Recommended Scan Interval Values

| Idle Timeout | Recommended Scan Interval |
|--------------|--------------------------|
| 5 minutes | 30 seconds |
| 30 minutes | 2 minutes |
| 1 hour | 5 minutes |
| 24 hours | 30 minutes |
| 7 days | 1 hour |

A general rule: set scan interval to roughly 5-10% of the idle timeout for timely collection.

## Performance Impact of Scan Interval

A very short scan interval (e.g., 1 second) with many active actors creates CPU overhead:

```text
10,000 active actors * scan every 1s = 10,000 checks/second
```

A balanced scan interval (30s to 5m) for typical workloads:

```text
10,000 active actors * scan every 30s = ~333 checks/second
```

## Monitoring Scan Effectiveness

Track whether actors are being collected at the expected rate:

```bash
# After setting actorIdleTimeout="5m" and actorScanInterval="30s",
# actors should start deactivating around 5 minutes after their last call

curl http://localhost:9090/metrics | grep dapr_runtime_actor_deactivated_total
```

Prometheus alert for actors not being collected:

```promql
# Alert if no deactivations have happened in the last hour
increase(dapr_runtime_actor_deactivated_total[1h]) == 0
```

## Dynamic Tuning Considerations

The scan interval cannot be changed at runtime without restarting the Dapr sidecar. Plan your configuration for peak load scenarios - a scan interval that works at 100 active actors may cause CPU spikes at 100,000 active actors.

For deployments with hundreds of thousands of active actors, use a scan interval of at least 5 minutes to reduce collection overhead:

```json
{
  "actorIdleTimeout": "2h",
  "actorScanInterval": "10m"
}
```

## Summary

The actor scan interval in Dapr controls the responsiveness of idle actor cleanup, and must be tuned alongside `actorIdleTimeout` for effective memory management. Setting it too low wastes CPU on frequent scans; setting it too high delays deactivation of idle actors. The optimal value depends on your actor population size and how precisely you need idle timeout enforcement.

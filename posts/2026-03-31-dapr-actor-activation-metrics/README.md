# How to Monitor Dapr Actor Activation Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Metric, Observability, Prometheus

Description: Track Dapr actor activation, deactivation, and active count metrics to understand actor lifecycle behavior and resource usage patterns.

---

Dapr actors have a unique lifecycle - they activate on first call and deactivate after an idle timeout. Monitoring activation metrics helps you understand how many actors are running, how frequently they cycle, and whether your placement service is distributing actors evenly.

## Key Actor Metrics

Dapr exposes these actor lifecycle metrics:

- `dapr_runtime_actor_deactivated_total` - cumulative deactivations
- `dapr_runtime_actor_pending_actor_calls` - queued calls waiting for an actor
- `dapr_runtime_actor_timers_fired_total` - timer executions
- `dapr_runtime_actor_reminders_fired_total` - reminder executions

Active actor counts are not available as a Prometheus metric. Use the Dapr metadata API (`GET /v1.0/metadata`) to query active actor counts per type at runtime.

## Querying Active Actor Count

Since active actor counts are exposed through the metadata API rather than Prometheus, query them with:

```text
curl http://localhost:3500/v1.0/metadata
```

The response includes an `actorRuntime.activeActors` array with `type` and `count` for each actor type. To expose this data to Prometheus, you can build a custom exporter that polls the metadata endpoint periodically.

## Deactivation Rate

```text
# Deactivation rate (actors going idle)
rate(dapr_runtime_actor_deactivated_total[5m])
```

High deactivation rates mean your actors are frequently going idle, which increases activation overhead. Consider adjusting the idle timeout if this causes latency spikes.

## Pending Call Queue Depth

A growing pending call queue indicates actors cannot keep up with demand:

```text
# Pending calls per actor type
dapr_runtime_actor_pending_actor_calls{actor_type="OrderActor"}

# Alert if queue is building up
dapr_runtime_actor_pending_actor_calls > 100
```

## Timer and Reminder Activity

```text
# Timer firing rate per actor type
rate(dapr_runtime_actor_timers_fired_total[5m])

# Reminder firing rate
rate(dapr_runtime_actor_reminders_fired_total[5m])

# Reminder failures
rate(dapr_runtime_actor_reminders_fired_total{success="false"}[5m])
```

## Alert Rules for Actor Metrics

```yaml
groups:
- name: dapr-actors
  rules:
  - alert: DaprActorHighPendingCalls
    expr: dapr_runtime_actor_pending_actor_calls > 50
    for: 3m
    labels:
      severity: warning
    annotations:
      summary: "Actor type {{ $labels.actor_type }} has {{ $value }} pending calls"

  - alert: DaprActorReminderFailures
    expr: rate(dapr_runtime_actor_reminders_fired_total{success="false"}[5m]) > 0
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Actor reminders failing for type {{ $labels.actor_type }}"

  - alert: DaprActorHighDeactivationRate
    expr: rate(dapr_runtime_actor_deactivated_total[5m]) > 100
    for: 10m
    labels:
      severity: info
    annotations:
      summary: "High deactivation rate for actor type {{ $labels.actor_type }}"
```

## Grafana Visualization

Create a dashboard panel showing actor lifecycle over time:

```text
# Panel 1 - Deactivation rate
rate(dapr_runtime_actor_deactivated_total{app_id="$app_id"}[5m])

# Panel 2 - Pending calls
dapr_runtime_actor_pending_actor_calls{app_id="$app_id"}

# Panel 3 - Timer and reminder firing rates
rate(dapr_runtime_actor_timers_fired_total{app_id="$app_id"}[5m])
rate(dapr_runtime_actor_reminders_fired_total{app_id="$app_id"}[5m])
```

## Summary

Actor activation metrics in Dapr reveal the health of your actor-based workflows. Use the metadata API to monitor active actor counts and understand memory pressure, watch pending call queues to detect throughput bottlenecks, and track reminder failure rates to ensure scheduled tasks execute reliably. Sudden spikes in deactivations often indicate traffic pattern changes that require adjustment of idle timeouts or actor placement configuration.

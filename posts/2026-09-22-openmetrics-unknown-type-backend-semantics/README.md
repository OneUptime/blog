# How to Map OpenMetrics `unknown` Metrics to Gauge or Counter Semantics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Datadog, Monitoring

Description: Resolve unknown OpenMetrics types by checking measurement semantics, correcting exporter metadata, and using narrow Datadog type overrides.

---

An OpenMetrics family with type `unknown` can be valid exposition while still being unusable to an ingestion backend that needs a gauge or counter. The missing information is semantic: does the value describe current state, or work accumulated since a reset?

Changing the type merely to stop a warning can produce plausible but incorrect dashboards. Establish what the source measures before changing the exporter or collector configuration.

## Read the source contract before inspecting a graph

Suppose an endpoint exposes:

```text
# TYPE warehouse_pending unknown
# HELP warehouse_pending Pending work reported by the warehouse API.
warehouse_pending{queue="imports"} 17
# EOF
```

If the source means “jobs currently waiting,” decreases are ordinary and the value is a gauge. If it means “jobs accepted since startup,” it is a cumulative counter. If it means “jobs accepted during the last completed minute,” it is an interval measurement; relabeling that number as a cumulative counter does not make its resets meaningful.

The [OpenMetrics type specification](https://prometheus.io/docs/specs/om/open_metrics_spec/#metric-types) allows Unknown when a more specific type is unavailable. That permission does not establish how another system should calculate rates. The [Prometheus metric type guidance](https://prometheus.io/docs/concepts/metric_types/) distinguishes changing state from monotonic totals.

Read the API field description or producer code and capture multiple observations. For a queue, enqueue work and drain it. For a cumulative total, perform a known number of operations, then restart the process in a test environment. Record the expected relationship between those actions and the values.

## Correct the producer when possible

For current queue depth, the corrected family is straightforward:

```text
# TYPE warehouse_pending gauge
# HELP warehouse_pending Jobs currently waiting for import.
warehouse_pending{queue="imports"} 17
# EOF
```

For accumulated accepted jobs, use a counter family with a clear name:

```text
# TYPE warehouse_jobs_accepted counter
# HELP warehouse_jobs_accepted Jobs accepted since process startup.
warehouse_jobs_accepted_total{queue="imports"} 412
# EOF
```

This changes the measurement contract as well as its metadata. If existing consumers used the old ambiguous metric, publish the new name during a migration period and update queries deliberately. Do not silently reinterpret historical values under one name.

Use a client library where practical. It can enforce naming and serialization rules, but it cannot determine whether an upstream field is cumulative. That remains an instrumentation decision.

## Use a narrow collector override when the producer is fixed

Datadog's latest OpenMetrics check supports a mapping with `name` and `type`. The supported native override types are documented in the [official configuration example](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example).

For the verified queue-depth example:

```yaml
init_config: {}
instances:
  - openmetrics_endpoint: http://warehouse-exporter:9108/metrics
    namespace: warehouse
    metrics:
      - warehouse_pending:
          name: pending
          type: gauge
```

This collects the source family as `warehouse.pending`. The override is local to this check: other scrapers still see the original Unknown metadata. Keep a short explanation beside the deployed configuration describing the upstream field and why gauge semantics are correct.

For a confirmed cumulative value, `type: counter` uses the latest check's counter handling and produces a `.count` metric. The [Datadog type mapping guide](https://docs.datadoghq.com/integrations/guide/prometheus-metrics/) explains the conversion to monotonic count submissions. Avoid applying a single counter override to `.*`; exporters commonly mix state and totals.

## Verify values and transitions

Run the Agent's configuration and check diagnostics:

```bash
sudo datadog-agent configcheck
sudo datadog-agent check openmetrics
sudo datadog-agent status
```

Then verify actual ingestion over several collection intervals. For a gauge, the backend should follow the observed 17-to-9 queue change directly. For a counter, compare the submitted increase with the known workload after an initial baseline has been established.

A first scrape, process restart, or label change is a separate test case. Counter handling has state, so a single successful debug invocation proves parsing and configuration more readily than it proves the whole accumulation behavior.

If the metric remains absent, check the source family name, include and exclude rules, and the resolved mode of the check. A `_total` sample may be matched using its suffix-free counter family name. Type overrides cannot repair an invalid payload or a selector that never matches.

Once the producer emits a correct type, remove redundant overrides after a canary confirms the same names and values. Keeping unnecessary local reinterpretations makes future exporter changes harder to diagnose.

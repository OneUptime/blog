# How to Keep a Datadog OpenMetrics Check Within Its Per-Instance Metric Limit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Datadog, Prometheus, Monitoring

Description: Keep Datadog OpenMetrics collection below its per-instance limit with explicit families, label-aware filtering, and observed submission counts.

---

The generic Datadog OpenMetrics check documents a limit of 2,000 metrics per instance. When an exporter grows beyond the intended collection scope, a broad selector can consume the limit before important measurements are submitted.

The practical fix is to define what the instance should collect and verify the resulting submissions. Counting `# TYPE` lines or raising a limit without understanding the workload is not a reliable capacity plan.

## Establish where collection stops

Run the Agent diagnostics on the process that executes the check:

```bash
sudo datadog-agent status
sudo datadog-agent configcheck
sudo datadog-agent check openmetrics
```

Find the affected endpoint, returned metric counts, and any limit warnings. The [integration documentation](https://docs.datadoghq.com/integrations/openmetrics/) identifies the per-instance limit and directs operators to Agent status for the returned count. The [V2 base implementation](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/base.py) declares the default and reports limit conditions.

Capture a realistic busy-period response. An exporter may expose far fewer series in development, before tenant queues appear or before all response-code combinations have been observed.

## Budget by families and dimensions

A family can contain many label combinations. For example, 20 routes, five status classes, and ten workers can yield 1,000 combinations before considering other dimensions. A classic histogram can expand each combination into several bucket and component submissions.

Use that arithmetic as an estimate, then measure the check's output. The number of raw lines, parsed families, submissions, and billable custom metric contexts are related but different quantities. Treat the Agent's actual limit reporting as the authority for whether this instance fits.

Make a small inventory mapping each selected family to a dashboard, alert, or operational use. Metrics with no identified consumer are good candidates for exclusion from this particular pipeline.

## Replace broad inclusion with a focused list

Start with named families:

```yaml
init_config: {}
instances:
  - openmetrics_endpoint: http://checkout-exporter:9108/metrics
    namespace: shop
    metrics:
      - checkout_requests: requests
      - checkout_queue_depth: queue.depth
      - checkout_latency_seconds: latency
    exclude_metrics_by_labels:
      environment:
        - sandbox
    collect_histogram_buckets: false
    tags:
      - service:checkout
```

The counter selector is the family name without `_total`. The histogram setting omits bucket submissions while retaining count and sum handling; use it only when the remaining metrics satisfy your needs. It is inappropriate if your latency objective requires histogram buckets or a distribution.

The [configuration reference](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example) documents `metrics`, `exclude_metrics`, label-based exclusion, and histogram controls. If retaining a regex selector, narrow it to an intentional prefix and exclude a known unused family group:

```yaml
metrics:
  - '^checkout_.*'
exclude_metrics:
  - '^checkout_debug_.*'
```

Review new exporter releases because a prefix rule automatically includes newly introduced matching families.

## Reduce unnecessary dimensions safely

A request ID, timestamp, or unconstrained URL label can create continual growth. The preferred repair is in instrumentation: aggregate by a stable route template or remove the unnecessary dimension before it becomes a metric label.

`exclude_labels` can remove labels from submitted tags, but it is not a general aggregation engine. If distinct source series collapse to one destination context, the result may no longer mean what you intend. Test numerical correctness as well as the reduced tag set.

Use `exclude_metrics_by_labels` when you want to discard a known subset, such as sandbox traffic, rather than pretend that subset never had distinguishing labels. Confirm that the labels being filtered are source names, because these filters run before label renaming.

## Verify the budget under growth and restart

Run the focused configuration on a canary through representative traffic. Check that essential request and error metrics still arrive, the count remains below the limit, and no warnings reappear when new workers or queues start.

Leave headroom for expected growth instead of tuning the normal case to the exact threshold. Record which families and dimensions account for the largest share so the next increase is understandable.

If different teams truly need independent metric sets, separate ownership can justify distinct collection instances with disjoint selections. Creating overlapping instances solely to evade the limit risks duplicate data and extra cost. Confirm endpoint uniqueness requirements and runner resources before adopting that design.

The final check is operational: dashboards and alerts should retain the measurements they need during the busiest expected workload, with a collection count that stays comfortably within the documented per-instance budget.

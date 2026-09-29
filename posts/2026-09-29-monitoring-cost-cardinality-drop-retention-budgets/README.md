# How to Keep Monitoring Costs Predictable with Cardinality Budgets, Drop Rules, and Tiered Retention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Prometheus, Cardinality, Cost Optimization

Description: Budget active series, sample volume and retained data, then apply ingestion and remote-write controls without losing essential alert coverage.

Monitoring costs become predictable when instrumentation has a budget and an owner. A storage-retention change alone cannot fix a continuously growing set of labels, and a recording rule does not automatically reduce the raw series still being ingested.

Build the budget around the units your system consumes: active series, new-series churn, samples per second, histogram payload size, retention, replication and query work. A vendor may bill only some of these, while your collectors and storage nodes still pay the operational cost of the others.

## Estimate volume before adding instrumentation

For ordinary float samples, a useful first approximation is:

```text
samples per day = active series × 86,400 / scrape interval in seconds
```

For 100,000 continuously scraped series at 30 seconds, that is 288 million samples per day before recording-rule outputs or replicated ingestion. This is a sample-count estimate, not a storage-byte estimate. Compression, labels, chunk layout, churn and histogram type all affect storage and memory.

Estimate each metric's combinations of bounded labels. A classic histogram also creates bucket, sum and count series for each combination. A raw URL or customer identifier can invalidate an otherwise careful budget because its number of values is not bounded by the design.

Prometheus's [metric naming guidance](https://prometheus.io/docs/practices/naming/) discusses the cost implications of label cardinality. Prefer route templates, status classes and bounded workload dimensions where they answer the operational question.

## Give services explicit budgets

Maintain a small contract per service: expected steady-state series, maximum churn during a rollout, scrape interval, essential alert metrics, diagnostic metrics and an owner. Compare those values before and after instrumentation deployments.

A budget should describe what happens when it is exceeded. A warning to the owner, an instrumentation rollback or a review of a debug family is more useful than silently dropping whichever samples happen to arrive last.

Use the [TSDB status API](https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats) to identify large metric families and high-cardinality labels. Review long-lived series and churn separately; a rotating identifier can create heavy index and WAL work even when an instant series count looks acceptable.

## Drop data at the correct boundary

For a disposable debug family, metric relabeling prevents ingestion into that Prometheus server:

```yaml
scrape_configs:
  - job_name: checkout
    static_configs:
      - targets: [checkout.example.net:9100]
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'checkout_debug_.*'
        action: drop
```

If local detail is useful but remote retention is expensive, apply a remote-write filter instead:

```yaml
remote_write:
  - url: https://metrics.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'checkout_debug_.*'
        action: drop
```

These are separate example fragments. The endpoint is a placeholder, and authentication must match the chosen backend. [Prometheus configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) documents the different relabeling stages.

The second rule does not save local TSDB ingestion or scrape costs. Neither rule fixes unbounded instrumentation at the source. Also avoid simply dropping distinguishing labels: relabeling does not sum colliding series and can create duplicate identities.

## Use retention tiers deliberately

A common policy retains detailed diagnostics briefly, service-level aggregates longer and contractual SLI evidence for the period required by the organization. Write down which investigations become impossible after each tier expires.

Prometheus local retention controls apply to its TSDB as a whole; they are not arbitrary per-metric retention rules. Separate deployments or a backend with appropriate retention policies may be needed for different tiers. The [storage documentation](https://prometheus.io/docs/prometheus/latest/storage/) explains local retention and storage behavior.

Recording rules create additional series. They save query work when reused, but they do not remove their source series. Reducing raw retention or selecting a reduced remote-write set is a separate policy change that must preserve the inputs required by live rules.

For downsampled counters and histograms, retain the information needed for the future query. Averaging precomputed percentiles does not reconstruct a global percentile. Document the resolution and aggregation semantics of each tier instead of treating all older data as interchangeable.

## Protect coverage while reducing volume

Before a drop or retention change, list dashboards, alerts, SLO calculations and incident workflows consuming the data. Test the proposed policy against known incidents and ordinary quiet periods. Keep heartbeat, scrape health and essential customer-impact metrics in the retained set.

Measure results after rollout: accepted samples, active series, remote bytes, query latency and alert coverage. A cheaper bill accompanied by a silent missing-metric alert is not a successful cost change. Set a review date for temporary debug instrumentation so it does not become permanent by neglect.

## Conclusion

Predictable monitoring costs come from bounded labels, owned budgets and deliberate data lifecycles. Apply drop rules at the boundary where savings are needed, and make retention tradeoffs explicit. Preserve essential detection and investigation paths while measuring the actual reduction in ingestion, storage and query work.

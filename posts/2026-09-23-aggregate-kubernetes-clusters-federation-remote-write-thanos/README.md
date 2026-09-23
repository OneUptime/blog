# How to Aggregate Metrics Across Kubernetes Clusters with Federation, Remote Write, or Thanos

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, Thanos, Monitoring

Description: Choose a multi-cluster metrics architecture, preserve cluster identity, and aggregate service measurements without counting scraper replicas twice.

A global dashboard needs more than a connection to several Kubernetes clusters. It needs a consistent answer to which clusters contributed, whether scraper replicas were deduplicated, and whether the result contains raw counters or already calculated rates.

Federation, remote write, and Thanos can all support a global view. They move or query data differently, so choose the architecture around the required history, failure behavior, and operational ownership.

## Establish a shared label contract

Give each cluster a stable identifier, such as `eu-prod-1`, that does not depend on a Prometheus pod name. Keep cluster identity distinct from scraper identity:

```yaml
global:
  external_labels:
    cluster: eu-prod-1
    replica: prometheus-a
```

Configure the other HA replica with the same cluster value and a different replica value. External labels identify data when Prometheus communicates with external systems; they are not automatically attached to every local query result. Standardize application labels such as `namespace` and `service` separately in the scrape pipeline. [Prometheus configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#configuration-file)

Validate the contract before rolling it out: two namespaces named `payments` in different clusters must remain distinguishable, while two scrapers of the same pod must remain recognizable as copies.

## Choose the data path

| Pattern | Useful starting point | Design obligation |
|---|---|---|
| Federation | A small set of cluster-level operational summaries | Select leaf metrics and monitor federation freshness |
| Remote write | Central durable storage and broad historical queries | Size queues and configure receiving-side HA behavior |
| Thanos Query | A unified query view over Prometheus and stored blocks | Operate StoreAPI connectivity, deduplication, and query failure policy |

These choices can coexist. For example, a Thanos deployment may include remote-write receivers. Avoid introducing two ingestion paths for the same logical stream without an explicit deduplication plan.

## Federate useful summaries

At each cluster, calculate a local request-rate recording rule:

```yaml
groups:
  - name: global_view
    rules:
      - record: namespace_service:http_requests:rate5m
        expr: |
          sum by (namespace, service) (
            rate(http_requests_total{job="application"}[5m])
          )
```

A central Prometheus can scrape that named result:

```yaml
scrape_configs:
  - job_name: cluster_federation
    honor_labels: true
    metrics_path: /federate
    params:
      'match[]':
        - '{__name__="namespace_service:http_requests:rate5m"}'
    static_configs:
      - targets:
          - eu-prometheus.example.internal:9090
          - us-prometheus.example.internal:9090
```

This is an illustrative private-network configuration; add the authentication and TLS settings required by the actual endpoints. Federation selects current source values, and `honor_labels` preserves their labels. It does not copy the source TSDB's entire history. [Prometheus federation](https://prometheus.io/docs/prometheus/latest/federation/)

Use one selected source per logical HA group in this simple central-Prometheus design. Scraping both replicas and summing their recorded values doubles the answer unless a separate deduplication mechanism handles them.

The central query can now combine cluster rates directly:

```promql
sum by (namespace, service) (
  namespace_service:http_requests:rate5m
)
```

Do not apply `rate()` to this recording: its values already represent requests per second. Use a separate name for any global recording so downstream consumers can identify its aggregation level.

## Use remote write when central storage owns history

Remote write sends samples to a receiving system:

```yaml
remote_write:
  - url: https://metrics.example.com/api/v1/push
```

The actual endpoint, authentication, tenant settings, and supported protocol belong to the receiving backend. Remote write itself does not transform raw application metrics into service totals. Calculate those totals with recording rules or queries at the appropriate layer.

Watch pending samples, retries, and the timestamp lag between the sender and receiver. A network interruption can leave local collection healthy while the global view is delayed. Prometheus's [remote-write tuning guide](https://prometheus.io/docs/practices/remote_write/) describes the queue and WAL behavior relevant to capacity planning.

Keep replica labels until the backend's documented HA mechanism consumes them. Removing the label from two active senders is not equivalent to deduplicating them and can create conflicting streams.

## Use Thanos for a unified query endpoint

Point Thanos Query at the relevant StoreAPI endpoints and configure its replica label. After deduplication, a normal global expression can retain cluster detail or intentionally remove it:

```promql
# One result per cluster and service
sum by (cluster, namespace, service) (
  rate(http_requests_total{job="application"}[5m])
)
```

Thanos can query sidecars, store gateways, and other StoreAPI implementations. Decide whether unavailable stores should fail the query or permit a result with warnings. A partial global sum may look healthy precisely because the failing cluster is absent. [Thanos Query](https://thanos.io/tip/components/query.md/)

## Prove completeness before trusting the total

Test with independently known traffic in two clusters. Remove one cluster's query or ingestion path and verify that the dashboard signals missing coverage. Then fail one scraper replica while keeping its cluster alive; coverage should remain available without a twofold change in sustained traffic.

Retain a per-cluster drill-down next to the global number. It provides the evidence needed to distinguish lower demand from delayed ingestion, missing stores, inconsistent labels, or an aggregation rule that omitted an entire workload.

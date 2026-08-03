# How to Route Different Metrics to Different Remote Write Backends by Label

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, Metrics Routing, Relabeling, Multi-Tenancy, Labels

Description: Route series to independent Remote Write destinations with label-based filters, explicit overlap rules, safe defaults, and observable queues.

---

Prometheus does not have a dynamic Remote Write URL template or a first-match routing table. Instead, every `remote_write` entry creates an independent queue, and its `write_relabel_configs` decides whether each series belongs to that destination.

That model is simple and powerful:

```text
ingested series -> evaluate backend A filter -> send or drop for A
                -> evaluate backend B filter -> send or drop for B
                -> evaluate backend C filter -> send or drop for C
```

A series can match zero, one, or several destinations. Routing is exclusive only if your filters make it exclusive.

## Route by a Team Label

Suppose every application metric has a controlled `team` label. Configure one entry per backend:

```yaml
remote_write:
  - name: payments
    url: https://payments-metrics.example.net/api/v1/write
    authorization:
      credentials_file: /etc/prometheus/secrets/payments-token
    write_relabel_configs:
      - source_labels: [team]
        regex: payments
        action: keep

  - name: search
    url: https://search-metrics.example.net/api/v1/write
    authorization:
      credentials_file: /etc/prometheus/secrets/search-token
    write_relabel_configs:
      - source_labels: [team]
        regex: search
        action: keep
```

A series with `team="payments"` is kept by the first queue and dropped by the second. A series with no `team` label is dropped by both because a missing source label becomes an empty string and matches neither regex.

The `name` values must be unique. Prometheus uses them as the `remote_name` label in its own Remote Write metrics and in logs, making each route observable.

## Add an Explicit Default Route

Silent loss of unlabeled data is often undesirable. Add a catch-all destination that excludes values already routed elsewhere:

```yaml
remote_write:
  - name: payments
    url: https://payments-metrics.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [team]
        regex: payments
        action: keep

  - name: search
    url: https://search-metrics.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [team]
        regex: search
        action: keep

  - name: shared-default
    url: https://shared-metrics.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [team]
        regex: 'payments|search'
        action: drop
```

The default queue drops the two explicitly routed teams and sends everything else, including missing `team`. Prometheus relabel regexes are anchored, so the alternation matches exactly those values.

Decide deliberately whether the default is a quarantine backend, a shared production backend, or no backend at all. Add an alert for unlabeled application series so the default does not become a permanent dumping ground.

## Route by Metric Name and Label

The special `__name__` label can participate in routing. Send production application latency metrics to a high-resolution backend:

```yaml
remote_write:
  - name: high-resolution
    url: https://high-res.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [environment]
        regex: production
        action: keep
      - source_labels: [__name__]
        regex: 'http_request_duration_seconds_.*|rpc_client_duration_seconds_.*'
        action: keep
```

The two rules are sequential, so a series must be from production **and** match one of the named metric families.

Send everything except those families to a lower-cost backend:

```yaml
  - name: standard-retention
    url: https://standard.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [environment, __name__]
        separator: ';'
        regex: 'production;(http_request_duration_seconds_.*|rpc_client_duration_seconds_.*)'
        action: drop
```

This pair is exclusive only for the conditions shown. Non-production latency metrics go to standard retention. Write a routing table before writing regexes so this outcome is intentional.

## Use a Dedicated Routing Label

A low-cardinality label such as `metrics_tier` makes policy easier to review than a growing metric-name regex:

```yaml
scrape_configs:
  - job_name: checkout
    static_configs:
      - targets: [checkout:9100]
        labels:
          metrics_tier: premium

  - job_name: batch-workers
    static_configs:
      - targets: [workers:9100]
        labels:
          metrics_tier: standard
```

Then route it:

```yaml
remote_write:
  - name: premium
    url: https://premium.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [metrics_tier]
        regex: premium
        action: keep

  - name: standard
    url: https://standard.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [metrics_tier]
        regex: standard
        action: keep
```

Keep routing values bounded. Putting customer IDs or unbounded paths into a routing label increases series cardinality even if the label is later removed from one outbound path, because it already differentiated locally ingested series.

If the backend should not store the routing label, remove it only after the `keep` rule:

```yaml
write_relabel_configs:
  - source_labels: [metrics_tier]
    regex: premium
    action: keep
  - regex: metrics_tier
    action: labeldrop
```

Before dropping it, prove that other labels keep every outbound series unique. Removing the only differentiator can merge distinct local series and cause duplicate or out-of-order samples.

## Route to Different Tenants on One Service

Some backends use the same URL but require a fixed tenant header per client. Use separate entries:

```yaml
remote_write:
  - name: tenant-payments
    url: https://mimir.example.net/api/v1/push
    headers:
      X-Scope-OrgID: payments
    authorization:
      credentials_file: /etc/prometheus/secrets/mimir-token
    write_relabel_configs:
      - source_labels: [team]
        regex: payments
        action: keep

  - name: tenant-search
    url: https://mimir.example.net/api/v1/push
    headers:
      X-Scope-OrgID: search
    authorization:
      credentials_file: /etc/prometheus/secrets/mimir-token
    write_relabel_configs:
      - source_labels: [team]
        regex: search
        action: keep
```

The header is static per `remote_write` entry. Prometheus does not substitute the sample's label value into a header or URL. Use only the tenant header and endpoint documented by the receiver.

## Avoid Accidental Fan-Out and Gaps

Create a small truth table for representative series:

| Series | payments | search | default |
| --- | ---: | ---: | ---: |
| `team=payments` | send | drop | drop |
| `team=search` | drop | send | drop |
| `team=platform` | drop | drop | send |
| no `team` | drop | drop | send |

Then test edge cases:

- missing versus empty labels;
- case differences such as `Payments` versus `payments`;
- metrics created by recording and alerting rules;
- Prometheus self-metrics and generated `up` series;
- stale markers when targets disappear;
- a new team value not yet represented in the policy.

Overlapping `keep` regexes create intentional or accidental fan-out. That duplicates network and receiver ingestion. Non-overlapping filters without a default create gaps. Prometheus will not warn that your business routing policy is incomplete.

## Observe Every Queue Independently

Each destination can be healthy or unhealthy on its own:

```promql
prometheus_remote_storage_samples_pending
```

```promql
rate(prometheus_remote_storage_samples_failed_total[5m])
```

```promql
prometheus_remote_storage_queue_highest_timestamp_seconds
-
prometheus_remote_storage_queue_highest_sent_timestamp_seconds
```

Group or alert by `remote_name` and `url`. A stalled payments queue does not automatically reroute its series to search or default. Multiple Remote Write entries provide fan-out, not conditional failover.

Compare the receiver's active series and sample rate with the planned truth table. Sender counters prove a queue sent samples, but receiver queries prove they landed in the intended tenancy and label space.

## Keep Routing Ownership Clear

Labels used for cost, compliance, or tenant routing should come from a controlled source such as service discovery, a scrape configuration, or a centrally reviewed relabel rule. Trusting arbitrary application-supplied tenant labels can let an application send data into another team's backend.

Document:

1. allowed routing label values;
2. the default behavior for missing or unknown values;
3. whether overlap is permitted;
4. which labels are removed before sending;
5. the owner of each destination and credential;
6. how a new route is tested.

That policy turns independent filters into a predictable routing system.

## Official Documentation

- [Prometheus Remote Write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus relabel configuration and actions](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
- [Prometheus global external labels](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#configuration-file)
- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus Remote Write queue metrics source](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go)
- [Grafana Mimir authentication and multitenancy](https://grafana.com/docs/mimir/latest/manage/secure/authentication-and-authorization/)

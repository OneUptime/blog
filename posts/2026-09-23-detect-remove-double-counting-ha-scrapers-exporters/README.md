# How to Remove Double Counting from HA Scrapers and Duplicate Exporters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Thanos, PromQL, Monitoring

Description: Trace duplicate observations to their collection path, configure HA deduplication, and preserve independent workloads when calculating totals.

A request rate doubles immediately after adding a second Prometheus replica. The application has not become busier: two collectors now observe the same counter, and the global query adds both copies. A similar symptom occurs when two exporters expose the same database statistics under different target labels.

Start by identifying who owns each measurement. Two application processes handling different requests should contribute to a service total. Two scrapers observing one application process should contribute one copy. Equal values alone cannot distinguish these cases.

## Inspect the series before calculating the total

Query the unaggregated counter through the same endpoint Grafana uses:

```promql
http_requests_total{service="checkout"}
```

Inspect `cluster`, `job`, `instance`, application labels, and the scraper replica label. A typical HA pair differs only in `replica`:

```text
{cluster="eu1",job="api",instance="10.0.0.8:8080",service="checkout",replica="a",status="200"}
{cluster="eu1",job="api",instance="10.0.0.8:8080",service="checkout",replica="b",status="200"}
```

With deduplication disabled in a diagnostic query, find candidate copies:

```promql
count without (replica) (
  http_requests_total{service="checkout"}
) > 1
```

This finds repeated identities after removing the chosen replica label. It does not prove the sources are interchangeable. Review the scrape configuration and target addresses for each result. Prometheus defines a series through its metric name and complete labels, so distinct replica labels distinguish both observations in the global view. The external labels configured below are added when communicating with external systems; they are not added to locally stored series in each Prometheus replica. [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)

## Configure the HA boundary explicitly

For a Thanos deployment, give both Prometheus replicas the same external labels except for a dedicated replica label. The first replica might contain:

```yaml
global:
  external_labels:
    cluster: eu1
    replica: a
```

The second uses `replica: b`. Their scrape jobs must otherwise identify the same underlying targets consistently. Configure Query to recognize that label:

```bash
thanos query \
  --query.replica-label=replica \
  --endpoint=prometheus-a-sidecar:10901 \
  --endpoint=prometheus-b-sidecar:10901
```

Thanos merges streams differing only in configured replica labels when deduplication is enabled. Its HA algorithm can use another replica to cover collection gaps. Treat this command as a fragment of your existing secured deployment, including its networking and TLS configuration. [Thanos Query deduplication](https://thanos.io/tip/components/query.md/#deduplication)

Never designate `cluster`, `instance`, or `pod` as a replica label merely to make totals smaller. Those labels usually distinguish independent work. Doing so can silently remove legitimate measurements.

Remote-write backends can deduplicate at ingestion instead. Grafana Mimir's HA tracker elects a scraper replica using configured cluster and replica labels; that is different from having PromQL choose a maximum later. Verify the receiving backend's configuration as well as the sender's labels. [Mimir HA deduplication](https://grafana.com/docs/mimir/latest/configure/configure-high-availability-deduplication/)

## Distinguish duplicate exporters from duplicate scrapers

Suppose two database exporters report the same database counter but have different `instance` values. A Thanos replica setting will not merge them automatically, because the remaining series identities differ.

Add or inspect a stable identity for the monitored database, such as `database_id`, then investigate candidates:

```promql
count by (cluster, database_id) (
  db_transactions_total{job="database"}
) > 1
```

This example assumes one counter per database per exporter. Include any genuine dimensions, such as transaction outcome, in the grouping if they exist. Otherwise the query also counts legitimate variants.

Choose one authoritative exporter for a shared counter, or use an explicitly coordinated HA collection arrangement. Independent exporters can maintain different caches, polling times, or reset histories even when they read the same system. An ownership table mapping logical resources to collection jobs is often more useful than increasingly elaborate PromQL.

## Avoid arithmetic repairs that change with topology

Dividing the total by two fails when one scraper disappears. Averaging perfectly synchronized identical replicas can preserve the value, but differing scrape times, gaps, and reset histories make it an unreliable general deduplication policy. Taking the maximum of raw cumulative counters can switch between streams with different reset histories; applying `rate()` afterward does not reconstruct the original counter reliably.

Once the backend returns one observation stream per underlying target, calculate rates per target and then total them:

```promql
sum by (cluster, service) (
  rate(http_requests_total{service="checkout"}[5m])
)
```

Keep gauges separate in the investigation. A shared queue depth reported by multiple observers needs an ownership or deduplication policy, while disjoint worker queues may legitimately be summed. Prometheus's [exporter guidance](https://prometheus.io/docs/instrumenting/writing_exporters/) also warns against exposing both component values and their total as members of one summable metric.

## Test failover as well as steady state

Use a staging workload with a known request rate. Compare the result with one scraper, both scrapers, replica A unavailable, replica B unavailable, and one scraper returning after a gap. Differences around scrape boundaries are possible, but the sustained total should not scale with the number of observers.

For query-time deduplication, compare deduplicated and diagnostic raw queries over identical times (in Thanos, use `dedup=false` for the diagnostic query). If the backend deduplicates at ingestion, discarded replica samples cannot be recovered by disabling query-time deduplication; inspect the source Prometheus replicas instead. Check backend warnings and missing-source alerts independently: a plausible total can still be incomplete. Finally, confirm that doubling the number of application workers carrying independent traffic does increase the total. That last check catches configurations that accidentally deduplicate the workload itself.

# How to Detect a Silent Exporter That Returns HTTP 200 but Serves Frozen Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Prometheus, Exporter, Troubleshooting

Description: Detect successful scrapes that serve stale cached data by separating scrape freshness from source collection and semantic progress.

An exporter can answer every scrape while its database poller has been dead for an hour. Prometheus keeps recording fresh samples of the same cached value, and `up` remains one. This is a data freshness failure, which requires a signal about the observation itself.

The first design decision is to define what “fresh” means. A temperature sensor can legitimately report the same temperature repeatedly. An empty queue can stay empty all night. A business counter that does not change is not proof that collection is stuck.

## Publish the source observation time

Add a gauge that advances only after a complete successful source collection:

```text
# HELP inventory_last_successful_collection_timestamp_seconds Last successful source collection.
# TYPE inventory_last_successful_collection_timestamp_seconds gauge
inventory_last_successful_collection_timestamp_seconds{source="warehouse"} 1790647200
```

The Unix timestamp is an illustrative value. The exporter should update it atomically with the cached snapshot. A scrape handler must not change this timestamp simply because a client requested `/metrics`.

Expose collection attempts, collection failures and duration as separate metrics. A recent attempt with an old success timestamp means something different from a poller that stopped attempting work. Prometheus's [instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/) supports tracking batch and offline progress with last-event timestamps.

## Alert on the age and on absence separately

If the source normally refreshes every 30 seconds, a policy might allow 180 seconds before a pending alert:

```yaml
groups:
  - name: inventory-freshness
    rules:
      - alert: InventoryExporterFrozen
        expr: |
          (
            time() - inventory_last_successful_collection_timestamp_seconds > 180
          )
          and on (job, instance)
          (up{job="inventory-exporter"} == 1)
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Inventory source collection is stale"
      - alert: InventoryFreshnessMetricMissing
        expr: |
          up{job="inventory-exporter"} == 1
          unless on (job, instance)
          inventory_last_successful_collection_timestamp_seconds
        for: 2m
        labels:
          severity: warning
```

These examples assume the exporter supplies one freshness series per source and the normal Prometheus target labels. If only some sources disappear, a per-target existence check is insufficient: compare an independent expected-source inventory with observations using `source` as an additional matching label.

Keep a separate `up == 0` rule. The freshness rule intentionally describes an endpoint that remains scrapeable. Also cover removal from discovery using expected inventory; a target that disappears no longer has a current `up` sample.

## Scrape timestamps cannot detect a cached payload

This query measures the age of the most recently stored sample:

```promql
time() - timestamp(inventory_items{source="warehouse"})
```

When Prometheus assigns scrape-time timestamps, the age stays small even if the metric value came from an old cache. `timestamp()` reports sample time, not the time the exporter last contacted the warehouse. Exporter-supplied timestamps can change this interpretation, so check [scrape timestamp configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) before relying on it.

Likewise, `changes(inventory_items[15m]) == 0` identifies a constant value, not a failed collection. Use that only for a signal contractually guaranteed to change, such as an independently generated sequence, and retain explicit freshness as the main evidence.

## Keep freshness and semantic progress distinct

Suppose a worker polls successfully but receives the same stuck cursor forever. Its collection is fresh, yet the job is not progressing. Add a last-progress timestamp updated only when an item is committed or a cursor advances. Gate progress alerts on outstanding work so idle periods remain healthy.

A useful incident table has three columns: last collection, last progress and backlog age. Fresh collection plus old progress and nonempty backlog points toward a processing problem. Old collection makes backlog itself untrustworthy.

Never convert a missing freshness metric to zero and then show a green “idle” state. Missing metadata means the freshness contract is unknown. Also detect timestamps too far in the future: clock skew can make stale data appear fresh for hours.

## Validate the failure you actually fear

In staging, freeze the source poller without stopping HTTP serving. Verify that `up` remains one and freshness ages until the alert fires. Then test an unchanged but valid snapshot, a failed upstream call, a process restart before first collection, and a clock offset.

Choose thresholds from the source polling period, timeout, retry policy and tolerated business delay. A `for` duration adds latency after the freshness threshold is crossed; include both in the detection budget. The [alerting rule documentation](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) defines that pending behavior.

## Conclusion

Detect frozen exporters with an explicit timestamp tied to successful source work. Pair it with scrape health, required-metric presence and semantic progress where needed. That preserves legitimate stable values while making HTTP success insufficient to conceal an obsolete snapshot.

# How to Refresh Shared OpenMetrics Metadata Labels in Datadog After They Change

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Datadog, Prometheus, Monitoring

Description: Refresh Datadog labels joined from OpenMetrics metadata by disabling the shared-label cache and validating unambiguous match keys.

---

If a Datadog OpenMetrics metric retains an old region, owner, or version tag after the exporter changes its metadata, inspect `cache_shared_labels`. In the latest check, `share_labels` caches metadata from the first payload by default. Set `cache_shared_labels: false` when the shared information can change while the check remains running.

Restarting the Agent may temporarily refresh the tags, but it does not solve a recurring cache-policy mismatch.

## Separate metadata from the measurement

Suppose an exporter reports queue depths and queue ownership in one response:

```text
# TYPE worker_queue_depth gauge
worker_queue_depth{queue="billing"} 12
worker_queue_depth{queue="emails"} 3
# TYPE worker_queue_metadata gauge
worker_queue_metadata{queue="billing",owner="payments",region="eu-west"} 1
worker_queue_metadata{queue="emails",owner="messaging",region="eu-west"} 1
# EOF
```

The metadata family is a gauge-valued compatibility pattern here, with value one. The ownership labels should be attached only to measurements for the corresponding queue. Unconditionally sharing every source label would mix unrelated objects.

The [Datadog configuration reference](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example) defines `labels` as the fields to copy and `match` as the fields used to identify related measurements. Use both when an endpoint represents multiple objects.

## Configure a join that refreshes each payload

```yaml
init_config: {}
instances:
  - openmetrics_endpoint: http://worker-exporter:9108/metrics
    namespace: workers
    metrics:
      - worker_queue_depth: queue.depth
    share_labels:
      worker_queue_metadata:
        labels:
          - owner
          - region
        match:
          - queue
    cache_shared_labels: false
```

This should submit `workers.queue.depth` with `queue`, `owner`, and `region` tags. The metadata source still needs to appear in the scraped payload even though it is not selected for ordinary metric submission.

Use source names appropriate to the parser and configuration. An actual OpenMetrics Info family has its own family-name rules; the sample's `_info` suffix may not be part of the parsed family. If `raw_metric_prefix` is configured, use the prefix-free family name in `share_labels` as well.

The [shared-label implementation](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/labels.py) shows how the cache is populated and how disabling it clears shared label state between payloads. Check the version bundled with the deployed Agent when behavior differs from current source.

## Validate the change without restarting the check

First, confirm the resolved configuration contains the option:

```bash
sudo datadog-agent configcheck
sudo datadog-agent check openmetrics
```

Then let the normal Agent run and change only the metadata for `billing`, for example from `owner="payments"` to `owner="finance"`. Keep the queue label and gauge value stable. After subsequent collection intervals, examine new points grouped by owner.

The next submitted samples should use the new owner. Historical points still contain the old owner, and Datadog tag menus can retain historical values. Use a recent time range and inspect actual points rather than treating an old tag suggestion as proof that the cache is still stale.

Repeat with the metadata source placed before and after the queue measurements. Current code buffers metrics while finding configured metadata sources, but installed versions can differ. This is a useful regression check after an integration upgrade.

## Make matching deterministic

For each queue, emit exactly one authoritative metadata row per scrape. Two rows for `billing` with different owners create an ambiguous join. Do not rely on response ordering to select the preferred owner.

Ensure every metadata row includes the match key. A missing `queue` label cannot provide the identity needed to associate it safely. If the exporter covers multiple clusters where queue names repeat, include a cluster identifier in both the measurements and `match` list.

Avoid overwriting an existing measurement label with conflicting metadata. Decide which source owns each label and use a distinct name when the meanings differ. The goal is a predictable enrichment contract, not the largest possible tag set.

## Check the operational cost

Refreshing metadata each scrape can increase buffering and memory usage, especially for large responses or absent metadata sources. Watch Agent memory, check duration, and source-response size under a realistic workload. Keep the copied labels limited to those used by dashboards or routing.

If the metadata is immutable for the lifetime of the check, caching remains reasonable. If it changes during deployments or ownership updates, recurring recomputation is the appropriate tradeoff. The repair is complete when a metadata-only change updates new measurements without an Agent restart and without assigning one object's labels to another.

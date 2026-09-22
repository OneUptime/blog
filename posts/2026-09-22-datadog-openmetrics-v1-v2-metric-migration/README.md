# How to Migrate Datadog OpenMetrics V1 to V2 and Preserve Metric Mappings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Datadog, Prometheus, Monitoring

Description: Migrate Datadog OpenMetrics checks to latest mode with explicit selector, naming, type, label, and dashboard compatibility checks.

---

Datadog OpenMetrics V1 and V2 refer to versions of Datadog's check implementation. They are separate from OpenMetrics wire-format versions. Migrating a check to V2 does not mean enabling the experimental OpenMetrics 2.0 specification.

For the generic check, `prometheus_url` selects legacy mode and `openmetrics_endpoint` selects latest mode. The [Datadog versioning guide](https://docs.datadoghq.com/integrations/guide/versions-for-openmetrics-based-integrations/) explains that these modes have different parameters and defaults. Build a metric contract before changing the endpoint key.

## Capture names and semantics before editing

Choose representative metrics: one gauge, one counter, and one histogram used by a monitor. Record the raw family, current Datadog name, type, tags, and dashboard query. Save the resolved configuration, because an Autodiscovery template may differ from the file you expect:

```bash
sudo datadog-agent configcheck
sudo datadog-agent status
sudo datadog-agent check openmetrics
```

Also save a response from the exporter. A counter's `_total` sample name and its parsed family name may differ. A migration inventory that copies only raw sample names will miss this distinction.

Do the comparison on a canary target or use a temporary namespace. Two checks submitting the same destination names and tags make it hard to determine which implementation produced a value and can duplicate collection.

## Translate the configuration deliberately

A latest-mode configuration might look like this:

```yaml
init_config: {}
instances:
  - openmetrics_endpoint: http://checkout-exporter:9108/metrics
    namespace: checkout_v2_canary
    metrics:
      - checkout_queue_depth: queue.depth
      - checkout_requests: requests
      - checkout_request_duration_seconds: request.duration
    rename_labels:
      method: http_method
    exclude_metrics:
      - '^checkout_debug_.*'
    collect_histogram_buckets: true
    tags:
      - migration:openmetrics-v2
```

For a counter exposed as `checkout_requests_total`, the selector is `checkout_requests`, and the latest check appends `.count` to the mapped destination. This example therefore produces `checkout_v2_canary.requests.count`. A gauge mapping produces `checkout_v2_canary.queue.depth`.

Consult the [current configuration example](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example) for the installed integration version. Common translations include `labels_mapper` to `rename_labels`, `label_to_hostname` to `hostname_label`, and `ignore_metrics` to `exclude_metrics`. Histogram collection and shared-label settings also changed names and structure.

Do not copy a legacy wildcard blindly. Latest-mode include and exclude patterns use regular expressions. For a prefix, write `^checkout_debug_.*`; shell-style `checkout_debug_*` has different regex meaning.

## Check destination types, not just names

The [metric mapping guide](https://docs.datadoghq.com/integrations/guide/prometheus-metrics/) documents that latest-mode histogram count, sum, and bucket components use count submissions, whereas legacy defaults can expose those components as gauges. A graph of lifetime totals and a graph of interval counts answer different questions.

If an existing name would change type, prefer an explicit migration name while rewriting and comparing queries. Reusing one name for incompatible semantics makes historical comparisons confusing even if current collection succeeds.

Check whether a dashboard already applies a rate conversion. A query designed around cumulative gauge values should not be copied unchanged onto count metrics. Review alert thresholds using a controlled workload and the intended query window, then record any expected numerical difference.

## Preserve labels and intentional exclusions

Test a metric with several label sets, not just an unlabeled health gauge. Confirm that renamed labels, host attribution, endpoint tags, and metadata joins retain the dimensions required by monitors.

Avoid reintroducing all metrics to diagnose one missing family. Add an explicit selector temporarily, then inspect the check output. Broad patterns can turn a migration into an unplanned cardinality increase.

If using a product-specific integration built on OpenMetrics, also read its own latest/legacy metric list. Those integrations can expose different metric subsets or require an additional mode setting; the generic-check example is not a universal configuration template.

## Cut over with a measurable rollback condition

Run the canary for multiple collection intervals, including an application restart and a metadata change. Compare expected request increments, queue values, histogram observation counts, and monitor results. Check collection errors and returned metric counts in Agent status.

Move the final approved mappings into the production namespace and disable the legacy instance for those targets. Keep the previous configuration available for rollback. A successful migration preserves the operational questions your dashboards answer, with the expected names, labels, and updated type semantics documented together.

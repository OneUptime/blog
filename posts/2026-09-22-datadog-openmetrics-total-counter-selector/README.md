# How to Fix Datadog OpenMetrics Counters Skipped by `_total` Selectors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Datadog, Prometheus, Monitoring

Description: Fix missing Datadog counters by matching the suffix-free OpenMetrics family and verifying the generated count metric over multiple scrapes.

---

A counter can appear in an exporter's response and still be absent from Datadog because the include rule uses its sample name instead of its parsed family name. In the latest Datadog OpenMetrics check, a counter ending in `_total` is selected without that suffix.

For example, the raw sample `checkout_requests_total` is selected as `checkout_requests`. Datadog then adds `.count` to the submitted name. The [OpenMetrics integration documentation](https://docs.datadoghq.com/integrations/openmetrics/) documents this behavior starting with Agent 7.32.0.

## Confirm the check mode and source type

Read the resolved Agent configuration:

```bash
sudo datadog-agent configcheck
```

Find the affected instance and confirm that it uses `openmetrics_endpoint`. An instance still configured with `prometheus_url` runs in legacy mode, where older examples and mapping assumptions apply. The [mode versioning guide](https://docs.datadoghq.com/integrations/guide/versions-for-openmetrics-based-integrations/) explains this separation.

Next, inspect the endpoint from the Agent's network environment:

```bash
curl --fail-with-body -sS \
  -H 'Accept: application/openmetrics-text;version=1.0.0' \
  http://checkout-exporter:9108/metrics
```

For an OpenMetrics 1.0 counter, expect a family and sample like these:

```text
# TYPE checkout_requests counter
# HELP checkout_requests Requests handled since startup.
checkout_requests_total{method="POST"} 900
# EOF
```

The type matters. A gauge that happens to end in `_total` has a misleading name, but its declared type still matters; an untyped numeric series may require a verified type override. Do not strip suffixes from every arbitrary metric name as a general repair.

## Select the family and map the destination

Configure the latest check as follows:

```yaml
init_config: {}
instances:
  - openmetrics_endpoint: http://checkout-exporter:9108/metrics
    namespace: shop
    metrics:
      - checkout_requests: requests
    tags:
      - service:checkout
```

The mapping key identifies the parsed source family. Its value supplies the destination base name. The resulting counter metric is `shop.requests.count`.

Avoid mapping to `requests.count` unless a doubled suffix is actually intended: the counter transformer appends `.count` itself. The [official counter implementation](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/transformers/counter.py) makes that naming step explicit.

If you do not need a rename, use:

```yaml
metrics:
  - checkout_requests
```

With namespace `shop`, that produces `shop.checkout_requests.count`. Update dashboards to use the actual submitted name, not the endpoint's `_total` sample name.

## Check filters in the correct name space

An include rule is only one part of collection. Review `exclude_metrics`, any configured `raw_metric_prefix`, and metric label filters. If `raw_metric_prefix: checkout_` is configured, the selector must use `requests` after the prefix is removed.

When testing one missing counter, an exact mapping is easier to reason about than a regular expression. If you use a pattern, anchor it to the intended family and remember that latest mode supports exact metric names and regex patterns, not shell globs.

The [current configuration reference](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example) describes these filters and mapping forms. Compare against the integration bundled with your deployed Agent when diagnosing an older installation.

## Verify increments, not the lifetime total

Run a check diagnostic after reloading the configuration:

```bash
sudo datadog-agent check openmetrics
sudo datadog-agent status
```

Then let the normal Agent collect multiple intervals. Establish a baseline, perform a known number of requests, and inspect `shop.requests.count` with the correct service tags and time range. A monotonic counter pipeline computes changes between raw cumulative values; the backend should not be expected to display the current raw total of 900 as each interval's request count.

The [Datadog type mapping documentation](https://docs.datadoghq.com/integrations/guide/prometheus-metrics/) describes counter conversion to count submissions. A single debug run can also lack an earlier baseline, so absence of an immediate counter point is not sufficient evidence that the mapping failed.

Test a restart separately. Restarting the producer resets its cumulative sequence, while restarting the Agent resets local collection state. Those are different events and should not be confused with a name-selection error.

If no samples arrive after several intervals, confirm the family is present for the selected labels, inspect check errors and metric limits, and verify that your dashboard is querying the `.count` destination. The exporter response, resolved selector, and final submitted name should form one traceable chain.

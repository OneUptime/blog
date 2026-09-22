# How to Rename OpenMetrics Metric Prefixes in Datadog Without Breaking Include Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Datadog, Prometheus, Monitoring

Description: Rename Datadog OpenMetrics prefixes by separating raw prefix removal, family selection, mapped names, and the final namespace.

---

When adding `raw_metric_prefix` makes Datadog metrics disappear, check the include rules. In the latest OpenMetrics check, this option removes a source prefix before the remaining configuration matches metric families. The selectors must use the resulting prefix-free names.

Keep four naming steps separate: the exported sample, the parsed family, the stripped family, and the final Datadog name. Writing them down usually exposes the mismatch immediately.

## Trace a counter from source to destination

Suppose the exporter serves:

```text
# TYPE vendor_checkout_requests counter
vendor_checkout_requests_total{method="POST"} 420
# TYPE vendor_checkout_queue_depth gauge
vendor_checkout_queue_depth{queue="default"} 7
# EOF
```

Configure the latest check like this:

```yaml
init_config: {}
instances:
  - openmetrics_endpoint: http://checkout-exporter:9108/metrics
    namespace: commerce
    raw_metric_prefix: vendor_checkout_
    metrics:
      - requests: http.requests
      - queue_depth: queue.depth
```

The naming sequence is:

| Stage | Counter name |
| --- | --- |
| Exported sample | `vendor_checkout_requests_total` |
| Parsed counter family | `vendor_checkout_requests` |
| After prefix removal | `requests` |
| Mapped base name | `http.requests` |
| Submitted metric | `commerce.http.requests.count` |

The gauge becomes `commerce.queue.depth`. A counter's `.count` suffix is added by the check; do not include it in the mapping value unless you intentionally want another suffix.

The [official configuration example](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example) states that configuration uses names after raw prefix removal. The [scraper implementation](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/scraper/base_scraper.py) performs that removal immediately after parsing the family.

## Rewrite includes and excludes together

This include rule no longer matches after stripping the prefix:

```yaml
metrics:
  - '^vendor_checkout_.*'
```

Use explicit names or patterns over the stripped family instead:

```yaml
metrics:
  - '^requests$': http.requests
  - '^queue_.*'
exclude_metrics:
  - '^queue_debug_.*'
```

Latest-mode patterns are regular expressions. `queue_*` means a different thing from a shell wildcard; `^queue_.*` clearly selects the intended prefix.

Review other name-based options in the same change, especially `share_labels`. If a metadata family becomes `build` after stripping, a shared-label rule referring to `vendor_checkout_build` will not locate it under the transformed name.

Label names are separate from metric-family names. `raw_metric_prefix` does not rename `vendor_region` into `region`; use `rename_labels` when that is the intended operation.

## Distinguish source cleanup from destination namespaces

`raw_metric_prefix` removes a prefix only when present. It does not add the final Datadog namespace. `namespace` supplies the destination namespace, while mapping values choose the destination base names.

This distinction matters if one endpoint contains both vendor metrics and unrelated runtime metrics. A family lacking `vendor_checkout_` remains unchanged before selection. With a broad `.*` selector, those unrelated families can still be collected.

It can also create name collisions. If the endpoint has both `vendor_checkout_queue_depth` and `queue_depth`, stripping the prefix makes them converge. Do not resolve that by relying on exposition order. Use a prefix strategy that leaves unique names, or keep the original families and apply separate explicit mappings.

The [Datadog metric mapping documentation](https://docs.datadoghq.com/integrations/guide/prometheus-metrics/) explains the additional suffixes and type-dependent destination behavior. Consult it before assuming that changing a base name preserves a histogram or counter query unchanged.

## Verify a small canary before renaming production

Inspect the resolved configuration and run the check:

```bash
sudo datadog-agent configcheck
sudo datadog-agent check openmetrics
sudo datadog-agent status
```

Confirm at least one gauge and one counter appear under the exact expected names. Let several scrapes run so the counter has a baseline and measurable increments. Check intended tags as well as values.

Use a temporary namespace during the comparison when historical metrics already occupy the desired destination. This makes rollback and side-by-side dashboard verification easier. Avoid running duplicate collectors into the same final contexts.

Then update dashboards and monitors to the approved names before retiring the old mapping. A metric rename creates a new destination identity; old history does not automatically move with it. Keep the old queries available for the retention period or comparison window you need.

A successful prefix change has a documented source-to-destination mapping, selectors written in the correct name space, and no accidental inclusion or collision introduced by the shorter names.

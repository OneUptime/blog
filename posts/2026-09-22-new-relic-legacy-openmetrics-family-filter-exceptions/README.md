# How to Exclude OpenMetrics Metric Families in the Legacy New Relic Integration While Keeping Selected Exceptions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: New Relic, Prometheus, Monitoring

Description: Filter legacy New Relic OpenMetrics families with prefixes and exceptions while preserving complete histograms and verifying fresh retained data.

---

The legacy New Relic OpenMetrics integration, `nri-prometheus`, supports filtering metric families through `transformations` and `ignore_metrics`. Combine `prefixes` with `except` when you want to discard a noisy family group while retaining selected subsets.

These settings belong to the legacy integration. The newer Kubernetes Prometheus agent uses Prometheus relabel configuration, so identify the deployed collector before changing its configuration file.

## Write the intended policy before the YAML

Suppose an exporter exposes these families:

```text
catalog_requests_total
catalog_request_duration_seconds
catalog_cache_entries
catalog_debug_allocations_total
process_resident_memory_bytes
```

You want to drop the `catalog_` group except request counts and request duration, while leaving unrelated process metrics unchanged. Express that policy in one filter entry:

```yaml
transformations:
  - description: Keep catalog request volume and latency
    ignore_metrics:
      - prefixes:
          - catalog_
        except:
          - catalog_requests_total
          - catalog_request_duration_seconds
```

The [official filtering documentation](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-openmetrics/ignore-or-include-prometheus-metrics/) documents combined `prefixes` and `except` entries. These are prefix rules, not a regex allowlist. An exception such as `catalog_requests_total` can also match names beginning with that string, so review the full exported family inventory for unintended neighbors.

Do not create a broad drop rule and assume a later independent rule can restore discarded data. Keep the exclusion and its exceptions together, then inspect all other transformations for overlapping drops.

## Distinguish group exceptions from an allowlist

If the desired policy is instead “send only these request metrics and drop everything else,” omit the `prefixes` list:

```yaml
transformations:
  - description: Only collect catalog request metrics
    ignore_metrics:
      - except:
          - catalog_requests_total
          - catalog_request_duration_seconds
```

That policy is much broader: process metrics and every unrelated family are now outside the exception list. Choose it only after checking which existing monitors depend on those other measurements.

Build an expected keep/drop table before deployment:

| Family | Group filter | Allowlist filter |
| --- | --- | --- |
| `catalog_requests_total` | Keep | Keep |
| `catalog_request_duration_seconds` | Keep | Keep |
| `catalog_cache_entries` | Drop | Drop |
| `process_resident_memory_bytes` | Keep | Drop |

The distinction is easy to miss when both configurations contain the same exception strings.

## Filter complete histogram and summary families

A classic histogram appears as bucket, count, and sum series in the response, but the legacy filter works on its base family. To keep `catalog_request_duration_seconds`, name that base rather than listing `_bucket`, `_sum`, or `_count` independently.

For example, all of these belong to the same selected histogram:

```text
catalog_request_duration_seconds_bucket{le="0.1"} 15
catalog_request_duration_seconds_bucket{le="+Inf"} 20
catalog_request_duration_seconds_sum 4.2
catalog_request_duration_seconds_count 20
```

Keeping only fragments would undermine distribution queries and count/sum relationships. The [Prometheus histogram documentation](https://prometheus.io/docs/practices/histograms/) explains how these components represent one set of observations. Check the family metadata as well as the sample lines when building the inventory.

## Place filters in the integration configuration

Merge the transformation block into the configuration actually loaded by `nri-prometheus`, preserving discovery, endpoints, credentials, and scrape intervals. In a Helm installation, inspect how chart values render into its ConfigMap rather than assuming arbitrary YAML keys are passed through.

The [legacy integration repository](https://github.com/newrelic/nri-prometheus) provides the configuration and deployment context. Record the installed release and save the previous configuration so the change can be rolled back.

Filtering happens before attribute add, rename, and copy transformations. Write selection rules against the names and context available at that point. A renamed attribute applied later cannot be used to justify why an earlier family filter should match.

## Verify fresh retained and discarded data

Test on a canary target with a known workload. Confirm request increments still arrive and histogram-related queries retain the expected observations. Check that the discarded families stop producing new points after the changed collector takes effect.

Use a narrow, recent query window and wait for the collection and ingestion intervals. Historical data does not disappear when a filter changes, so a metric still appearing in a name list is not evidence that collection continues.

Inspect integration errors and logs for configuration failures. If a supposedly excluded family keeps arriving, look for another scraper or a second collector configuration before widening the filter.

For Kubernetes migrations, translate this policy using the [new agent's transformation guidance](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-prometheus-agent/setup-prometheus-agent/#metric-label-transformations). Preserve the expected keep/drop table as the acceptance test across both implementations; the policy can remain the same even though the configuration syntax changes.

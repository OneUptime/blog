# Validation Summary: How to Fix 'Metric Cardinality Too High' Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Metrics
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript API
- OpenTelemetry Go API
- OpenTelemetry Collector
- OpenTelemetry Collector filter, transform, attributes, memory limiter, and batch processors
- Prometheus and PromQL

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry metrics data model specification: https://opentelemetry.io/docs/specs/otel/metrics/data-model/
- OpenTelemetry Python SDK View API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- Prometheus data model documentation: https://prometheus.io/docs/concepts/data_model/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated it to the current `readers.pull.exporter.prometheus.host` and `port` configuration.
- The Go example used `log.Printf` without importing `log`. Added the missing import.
- The Python View examples used lists for `attribute_keys`, but the Python SDK documents `attribute_keys` as a set. Updated examples to use set literals and `set()`.
- The first Python View example claimed it dropped only `request_id`, but `attribute_keys=set()` drops all measurement attributes. Updated the variable name and comments to match the actual behavior.
- The histogram View section described bucketing labels. Updated it to describe histogram bucket configuration and added the missing `ExplicitBucketHistogramAggregation` import in that code block.
- The filter processor examples used the legacy `metrics.exclude.match_type` shape. Updated them to the current OTTL-based `metric_conditions` configuration with `error_mode: ignore`.
- The transform processor examples used unqualified `attributes[...]` paths. Updated them to `datapoint.attributes[...]`, matching the current transform processor OTTL metric datapoint context.
- The transform processor example did not mention that the transform processor is only available in Collector distributions that include it. Added a short caveat.
- The attributes processor example said hashing limits cardinality. Hashing preserves distinct values, so it does not reduce cardinality. Updated the comment to describe hashing as obfuscation only.
- The Prometheus alert for total series count used `sum(scrape_series_added)`, which measures newly added series during scrapes rather than current total cardinality. Updated it to use `prometheus_tsdb_head_series`.
- The cardinality growth alert used `rate(scrape_series_added[1h])` without aggregation, producing per-series results. Updated it to `sum(rate(scrape_series_added[1h]))`.

## Review Notes
The remaining examples are intentionally illustrative and assume application-specific helpers, such as error categorization functions and Express app setup, are defined elsewhere. The Collector transform processor is a contrib component, so users of a minimal core-only Collector build need a distribution or custom build that includes it.

# Validation Summary: How to Migrate Datadog OpenMetrics V1 to V2 and Preserve Metric Mappings

## Status
validated

## Post Type
Technical migration guide with Agent commands and YAML configuration.

## Technologies Covered
- Datadog Agent and the generic OpenMetrics integration, legacy (V1) and latest (V2) modes.
- Prometheus and OpenMetrics metric exposition, counters, gauges, and histograms.
- YAML check configuration, regular-expression selectors, label mapping, and metadata joins.
- Datadog metric types, dashboards, monitors, and Autodiscovery.

## Sources Consulted
- [Datadog OpenMetrics integration](https://docs.datadoghq.com/integrations/openmetrics/) — endpoint-based mode selection, required settings, counter selectors, naming, and returned metric counts.
- [Latest and Legacy Versioning for OpenMetrics-based Integrations](https://docs.datadoghq.com/integrations/guide/versions-for-openmetrics-based-integrations/) — V1/V2 terminology, defaults, integration-specific modes, and metric subsets.
- [Mapping Prometheus Metrics to Datadog Metrics](https://docs.datadoghq.com/integrations/guide/prometheus-metrics/) — gauge, counter, and histogram submission types and monotonic-count behavior.
- [Current OpenMetrics configuration example](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example) — mapping syntax, regular expressions, label renaming, host attribution, histogram collection, and shared-label options.
- [Legacy OpenMetrics configuration example](https://github.com/DataDog/integrations-core/blob/7.30.x/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example) — legacy option names and wildcard exclusions; this is the legacy reference linked by the integration documentation.
- [Datadog Agent commands](https://docs.datadoghq.com/agent/configuration/agent-commands/) — status, configcheck, check, and reported check statistics.
- [Agent Check Status](https://docs.datadoghq.com/agent/troubleshooting/agent_check_status/) — manual check execution and repeated collection for rate inspection.
- [Prometheus OpenMetrics 2.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec_2_0/) — experimental wire-format specification, distinct from Datadog integration versions.

## Issues Found
No technical issues found.

## Review Notes
- The README required no changes. Its commands are valid for a Linux Agent installation; other deployment platforms have different command invocation patterns.
- Parsed the complete YAML example successfully with PyYAML. Confirmed all illustrated settings against the current configuration reference, including the three metric mappings, namespace, labels, exclusions, histogram buckets, and custom tags.
- Confirmed that the counter selector omits `_total` and the mapped destination receives `.count`. Datadog documents this behavior starting with Agent 7.32.0; the post describes current latest-mode behavior.
- Confirmed that latest-mode histogram components use count submissions, while legacy defaults use gauges. Monotonic-count submissions represent differences between consecutive observations; distribution options can alter collection behavior.
- Confirmed the legacy-to-latest option translations and the difference between legacy wildcard exclusions and latest regular expressions. Shared-label configuration also changes structure.
- The linked current configuration uses the moving master branch. Readers should use the configuration shipped with their installed integration version, as the post advises.
- A single manual check is useful for configuration and collection diagnostics; inspecting counter deltas requires multiple observations. Datadog documents `--check-rate` for inspecting rate metrics. The post correctly calls for multiple collection intervals and restart testing during canary validation.
- Current shared-label configuration caches labels by default through `cache_shared_labels`; metadata-change testing is therefore a useful part of the proposed migration checks.
- Verified the documentation links and the experimental status of OpenMetrics 2.0. The author profile is an attribution link, not a technical source.
- This was a documentation and configuration review. No live Datadog Agent, checkout exporter, dashboard, or monitor was available for end-to-end execution; exporter reachability, emitted metric types, and production query compatibility remain deployment-specific checks.

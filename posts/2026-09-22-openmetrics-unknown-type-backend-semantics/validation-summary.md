# Validation Summary: How to Handle an OpenMetrics `unknown` Type When the Backend Requires Gauge or Counter Semantics

## Status

validated

## Post Type

Technical troubleshooting guide with OpenMetrics exposition examples, Datadog configuration, and Agent diagnostic commands.

## Technologies Covered

- OpenMetrics 1.0 text exposition and metric family types
- Prometheus gauge and counter semantics
- Datadog OpenMetrics latest check, metric overrides, and monotonic counts
- Datadog Agent CLI
- YAML configuration

## Sources Consulted

- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/#metric-types): Unknown, gauge and counter semantics, counter suffixes, metadata, and EOF syntax.
- [Prometheus metric types](https://prometheus.io/docs/concepts/metric_types/): Gauge state measurements and cumulative counters.
- [Datadog OpenMetrics configuration example](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example): Endpoint, namespace, metric mappings, supported override types, and counter family matching.
- [Datadog OpenMetrics integration](https://docs.datadoghq.com/integrations/openmetrics/): Latest versus legacy mode and Agent version caveats.
- [Mapping Prometheus metrics to Datadog metrics](https://docs.datadoghq.com/integrations/guide/prometheus-metrics/): Counter conversion and monotonic count submission semantics.
- [Datadog Agent commands](https://docs.datadoghq.com/agent/configuration/agent-commands/): Configuration and status diagnostics.
- [Troubleshoot an Agent check](https://docs.datadoghq.com/agent/troubleshooting/agent_check_status/): Running individual check diagnostics.
- [Datadog OpenMetrics v2 metric transformer source](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/transform.py): Unknown metric skipping and explicit type override selection.
- [Datadog OpenMetrics v2 counter transformer source](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/transformers/counter.py): `.count` suffix and calls to `monotonic_count`.

## Issues Found

No technical issues found.

## Review Notes

- All three exposition examples conform to the relevant OpenMetrics 1.0 naming and text syntax rules. The counter family correctly omits `_total` in TYPE and HELP metadata and includes it in the sample name. Unknown is permitted for indeterminate third-party measurements, although the specification discourages its use.
- The distinction between queue depth, cumulative accepted jobs, and per-interval job counts is correct. Observations alone cannot establish the producer's intended measurement contract.
- The YAML structure and exact-name gauge override are valid. The namespace and mapped name yield `warehouse.pending`. Explicit overrides select a local transformer without changing the exporter's payload; native unknown families otherwise get skipped.
- The counter override uses monotonic count submission and appends `.count`. First observations, resets, and label changes warrant separate verification, as described in the post.
- `openmetrics_endpoint` selects latest mode; legacy mode uses `prometheus_url`. Datadog documents suffix-free counter selection starting with Agent 7.32.0. The post appropriately scopes its configuration to the latest check.
- The three Agent subcommands are valid for a host installation with the executable available. Datadog's Linux check troubleshooting instructions recommend running the check as `dd-agent` to reproduce service-account permissions.
- All four technical links in the post resolve to the intended official resources. No deprecated configuration or commands were identified.
- Review covered documentation, implementation source, and manual syntax inspection. No live exporter or Datadog ingestion test was performed. README.md was left unchanged.

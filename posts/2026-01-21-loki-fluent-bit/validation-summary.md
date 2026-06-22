# Validation Summary: How to Ship Logs to Loki with Fluent Bit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Fluent Bit
- Fluent Bit Loki output plugin
- Fluent Bit input, filter, parser, and output plugins
- Kubernetes DaemonSet logging
- Prometheus metrics

## Sources Consulted
- Fluent Bit official Loki output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/loki
- Fluent Bit official Tail input documentation: https://docs.fluentbit.io/manual/data-pipeline/inputs/tail
- Fluent Bit official multiline parsing documentation: https://docs.fluentbit.io/manual/data-pipeline/parsers/multiline-parsing
- Fluent Bit official Kubernetes filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Fluent Bit official Parser filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/parser
- Fluent Bit official Modify filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/modify
- Fluent Bit official Record Modifier filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/record-modifier
- Fluent Bit official Throttle filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/throttle
- Fluent Bit official monitoring documentation: https://docs.fluentbit.io/manual/administration/monitoring
- Fluent Bit official Prometheus exporter output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/prometheus-exporter
- Fluent Bit official Linux package installation documentation: https://docs.fluentbit.io/manual/installation/downloads/linux

## Issues Found
- Removed `batch_wait` and `batch_size` from Loki output examples. These are not documented configuration keys for Fluent Bit's built-in Loki output plugin; Fluent Bit batching is handled by the engine flush/chunking behavior and output retry settings.
- Corrected the complete Loki output example to use a coherent HTTPS endpoint with `TLS on`, port `443`, and TLS certificate settings.
- Replaced nested-key `Remove` examples in the Modify filter with top-level key removals. The documented Modify filter `Remove` rule operates on record keys as configured, and the shown Kubernetes nested-map paths were misleading as written.
- Removed `Allowlist_key` from the Record Modifier example because `Remove_key` and `Allowlist_key` are alternatives, not options to combine in the same filter.
- Updated the old multiline parser example to capture the remaining log text as `log`, matching Fluent Bit's documented `Parser_Firstline` expectations for old multiline configuration.
- Added `storage.metrics On` to the production service config because `/api/v1/storage` only returns storage-layer metrics when storage metrics are enabled.
- Fixed the Prometheus exporter example by adding a `fluentbit_metrics` input and routing only `internal_metrics` to `prometheus_exporter`. The Prometheus exporter output supports metrics events, not arbitrary log records.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. The examples still use Fluent Bit `2.2` images even though newer Fluent Bit versions exist as of 2026-06-21; this is not incorrect because the post requires Fluent Bit 2.0 or later, but future maintenance could update image tags and note version pinning practices.

# Validation Summary: How to Use Cilium Hubble Exporter Configuration

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Cilium
- Hubble exporter
- Kubernetes
- Helm
- kubectl
- Fluent Bit
- Elasticsearch output
- Prometheus metrics / PromQL

## Sources Consulted
- Cilium Hubble exporter configuration: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Hubble metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium flow proto API reference: https://docs.cilium.io/en/stable/_api/v1/flow/README/
- Cilium agent command reference: https://docs.cilium.io/en/stable/cmdref/cilium-agent_hive/
- Fluent Bit Tail input documentation: https://docs.fluentbit.io/manual/pipeline/inputs/tail
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch

## Issues Found
- The metadata and introduction claimed the Hubble exporter supports multiple output formats, export targets, and direct external destinations. Cilium's Hubble exporter writes JSON-line flow logs to a file or stdout, while dynamic exporter configuration can write different filtered outputs to files. Updated the wording to avoid implying arbitrary formats or destination backends.
- The prerequisites stated Cilium 1.15+, but the examples place file rotation settings under `hubble.export.static.*`, which matches the newer exporter-specific Helm layout documented in current Cilium releases. Updated the prerequisite to Cilium 1.18+.
- The field mask included `destination.port`, which is not a top-level Flow proto field, and `drop_reason`, which is deprecated in favor of `drop_reason_desc`. Updated the field mask to use `drop_reason_desc` and `l4`.
- The monitoring section used port `9962` and non-existent `hubble_export_*` metric names. Hubble metrics use port `9965` by default and the documented metric names include `hubble_lost_events_total` and `hubble_flows_processed_total` when the relevant Hubble metrics are enabled. Updated the command, metric list, PromQL example, and troubleshooting note.

## Review Notes
The Fluent Bit example is syntactically plausible for a basic Elasticsearch output, but production Elasticsearch 8 deployments commonly require `Suppress_Type_Name On` instead of relying on document types. That is version-specific logging-pipeline tuning rather than a Cilium exporter correction.

# Validation Summary: How to Use the dapr configurations Command

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Dapr CLI (`dapr configurations` command)
- Dapr Configuration CRD (`dapr.io/v1alpha1`, `kind: Configuration`)
- Kubernetes (custom resources, pod annotations)
- Distributed tracing (Zipkin, OpenTelemetry)
- Dapr metrics and feature flags

## Sources Consulted
- Dapr CLI configurations command reference — https://docs.dapr.io/reference/cli/dapr-configurations/
- Dapr Configuration spec — https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr configuration overview — https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr arguments and annotations overview — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr preview features — https://docs.dapr.io/operations/support/support-preview-features/
- Dapr metrics configuration — https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr CLI source code (configurations.go) — https://github.com/dapr/cli/blob/master/cmd/configurations.go
- Dapr runtime source code (types.go) — https://github.com/dapr/dapr/blob/master/pkg/apis/configuration/v1alpha1/types.go

## Issues Found

1. **Incorrect column name in sample output**: The blog post showed `MTLS-ENABLED` as a column in the `dapr configurations` output. The actual column is `METRICS-ENABLED`. The CLI source code confirms the output struct uses `Metrics` not `Mtls`. Fixed by replacing `MTLS-ENABLED` with `METRICS-ENABLED`.

2. **Missing `CREATED` column in sample output**: The actual CLI output includes a `CREATED` column showing the creation timestamp. This was missing from the blog post's sample output. Fixed by adding the `CREATED` column with example timestamps.

3. **Outdated field name `spec.metric` (singular)**: The blog post used `metric` (singular) in both the JSON output example and the YAML Configuration resource. While the singular form is technically still accepted for backwards compatibility, current Dapr documentation uses `metrics` (plural). Fixed both occurrences to use `metrics`.

4. **Incomplete `metrics.rules` structure**: The blog post showed `rules` with only a `labels` list containing `name: app_id`. The actual structure requires a `name` field at the rule level (specifying the metric name) and labels should include `regex` mappings. Fixed to show a correct example with a metric name and regex mapping.

## Review Notes
- The CLI flags (`--kubernetes`, `--namespace`, `--output json`) are all correct and verified against the source code.
- The Configuration CRD structure for `spec.tracing` (samplingRate, zipkin, otel) is accurate.
- The `spec.features` structure with `ActorStateTTL` is a valid preview feature confirmed in Dapr docs.
- Pod annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/config`) are all correct.
- The command also supports `--all-namespaces` / `-A` and `--name` / `-n` flags that the blog does not mention, but this is acceptable for a focused tutorial.

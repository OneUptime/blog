# Validation Summary: How to Use Dapr in Resource-Constrained Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, Configuration CRD, Component CRD)
- Kubernetes (annotations, resource limits, kubectl)
- Redis (as a state store backend)
- SQLite (as a lightweight state store backend)
- Dapr CLI (self-hosted mode)

## Sources Consulted
- [Dapr Configuration Schema Reference](https://docs.dapr.io/reference/resource-specs/configuration-schema/) — verified metric/metrics field name and tracing configuration structure
- [Dapr CLI `dapr run` Reference](https://docs.dapr.io/reference/cli/dapr-run/) — verified available CLI flags
- [Dapr Arguments and Annotations Overview](https://docs.dapr.io/reference/arguments-annotations-overview/) — verified sidecar resource annotation names
- [Dapr Component Scopes](https://docs.dapr.io/operations/components/component-scopes/) — verified scopes field placement in Component YAML
- [Dapr SQLite State Store](https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-sqlite/) — verified component type name and metadata fields

## Issues Found
1. **`spec.metric` should be `spec.metrics` (plural):** The Dapr Configuration CRD uses `metrics` (plural) as the field name for metrics configuration. The blog post used the singular form `metric`, which would not be recognized. Changed `metric:` to `metrics:` in the Configuration YAML example.

2. **`--enable-metrics=false` is not a valid `dapr run` flag:** The Dapr CLI `dapr run` command does not have an `--enable-metrics` flag. The correct way to disable metrics in self-hosted mode is via a Dapr configuration file. Replaced `--enable-metrics=false` with `--config edge-config.yaml` to reference the configuration file defined earlier in the post (which already disables metrics via `spec.metrics.enabled: false`).

## Review Notes
- The 50-100 MB memory claim for the Dapr sidecar refers to actual runtime consumption at low-to-moderate load, which is reasonable. Note that Dapr's recommended Kubernetes resource requests are higher (250Mi) to accommodate peak usage and I/O-heavy workloads.
- The `state.sqlite` component with `connectionString` metadata field and `file:` URI prefix was verified as correct against official docs.
- All four sidecar resource annotations (`dapr.io/sidecar-cpu-request`, `dapr.io/sidecar-cpu-limit`, `dapr.io/sidecar-memory-request`, `dapr.io/sidecar-memory-limit`) were verified as correct.
- Component `scopes` placement at the top level (sibling to `spec`) was verified as correct.

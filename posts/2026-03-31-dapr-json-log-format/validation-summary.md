# Validation Summary: How to Configure JSON Log Format in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (sidecar runtime, logging subsystem)
- Kubernetes (Deployments, annotations, kubectl)
- Helm (Dapr chart installation and upgrade)
- FluentD (log collection and parsing)
- Fluent Bit (log parsing)
- Grafana Loki (LogQL queries)

## Sources Consulted
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr logging and observability docs: https://docs.dapr.io/operations/observability/logging/logs/
- Dapr Helm chart values (global.logAsJson, per-component logLevel settings)

## Issues Found

1. **Invalid Helm value `global.logLevel`**: The Helm install command included `--set global.logLevel=info`, but the Dapr Helm chart has no `global.logLevel` parameter. Log levels are configured per-component (e.g., `dapr_operator.logLevel`, `dapr_sidecar_injector.logLevel`). Removed the invalid flag from the command.

2. **`fatal` listed as a valid log level**: The JSON log fields table listed `fatal` as a valid Dapr log level. Dapr only supports four levels: `debug`, `info`, `warn`, and `error`. Removed `fatal` from the list.

3. **Missing `scope` and `type` fields in JSON log fields table**: The official Dapr docs document 8 standard JSON log fields, but the post only listed 6. Added the missing `type` (log type) and `scope` (logging scope) fields to the reference table.

## Review Notes
- The FluentD and Fluent Bit configuration snippets are reasonable but are not sourced from official Dapr documentation. They represent common patterns for parsing JSON logs in Kubernetes.
- The Fluent Bit `Time_Format` uses `%L` (milliseconds, 3 digits), while Dapr timestamps can include microsecond precision (6 digits). This means some timestamp precision is lost, though Fluent Bit generally handles this gracefully.
- The Loki LogQL queries use valid syntax. The stream selector `{app="daprd"}` assumes a specific Kubernetes label configuration that may vary by deployment.
- The post references Dapr version 1.13.0 in examples. The configuration and annotations are still current in later Dapr versions.

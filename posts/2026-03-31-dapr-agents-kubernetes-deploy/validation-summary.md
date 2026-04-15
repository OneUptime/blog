# Validation Summary: How to Deploy Dapr Agents on Kubernetes

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Dapr (sidecar injection, Configuration CRD, CLI)
- Kubernetes (Deployments, Services, Secrets, RBAC, health probes)
- Docker (containerization)
- Python / Uvicorn (application runtime)

## Sources Consulted
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr metrics configuration: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr tracing configuration: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr CLI reference (dapr init): https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI reference (dapr status): https://docs.dapr.io/reference/cli/dapr-status/
- Dapr logs and troubleshooting: https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/
- Kubernetes API reference for Deployments, Services, RBAC resources

## Issues Found
1. **Dapr Configuration CRD field name typo**: `spec.metric.enabled` was changed to `spec.metrics.enabled` (plural). The Dapr Configuration schema uses the plural form `metrics`. The singular form would be silently ignored, meaning metrics would not be explicitly enabled as intended.

## Review Notes
- The RoleBinding `subjects` entry for the ServiceAccount omits the `namespace` field. For namespaced RoleBindings, Kubernetes defaults to the RoleBinding's own namespace, so this works correctly in practice. However, explicitly specifying `namespace: ai-agents` is considered best practice and would improve clarity if the manifest were ever adapted for ClusterRoleBindings.
- All six Dapr sidecar annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/log-level`, `dapr.io/config`, `dapr.io/enable-api-logging`) are correct per current Dapr documentation.
- The Dapr CLI commands (`dapr init --kubernetes --wait`, `dapr status -k`) are correct.
- The Dapr sidecar container name `daprd` (used in `kubectl logs -c daprd`) is correct.
- All Kubernetes manifests use correct API versions and field structures.
- The `kubectl port-forward svc/research-agent 8080:80` command correctly maps local port 8080 to Service port 80, which routes to container port 8080.

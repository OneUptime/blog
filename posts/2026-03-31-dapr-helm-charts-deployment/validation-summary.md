# Validation Summary: How to Use Helm Charts for Dapr Application Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar annotations, Component CRD, Configuration resources)
- Helm 3 (Chart.yaml v2, templates, values files, CLI commands)
- Kubernetes (Deployments, namespaces)
- Redis (as Dapr pub/sub component backend)

## Sources Consulted
- Dapr Component schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr component scopes documentation: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Redis pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/
- Helm chart structure and CLI documentation: https://helm.sh/docs/

## Issues Found
1. **`scopes` field incorrectly nested under `spec` in Dapr Component template**: The `scopes` field was indented under `spec:` in the pub/sub component template (`templates/components/pubsub.yaml`). Per the Dapr Component CRD schema, `scopes` is a top-level field at the same level as `spec` and `metadata`, not nested under `spec`. Fixed by moving `scopes:` and its associated range block to the top level (zero indentation relative to the resource root).

## Review Notes
- The `dapr.io/enable-metrics` annotation is valid and documented in the Dapr Kubernetes annotations reference. The default metrics port of 9090 is also correct.
- The Chart.yaml lists `dapr` as a chart dependency from `https://dapr.github.io/helm-charts/`. This is typically the Dapr control plane chart. Including it as an optional dependency (with `condition: dapr.enabled`) is a valid pattern for self-contained charts, though most production setups install Dapr separately at the cluster level.
- The `values.yaml` does not define a `resources` field, but the deployment template references `.Values.resources`. This is a common Helm pattern — if unset, `toYaml` produces empty output and no resource limits/requests are applied. This is not an error but could be noted as a best practice gap.
- The `-f values-production.yaml` path in the Helm CLI commands assumes the values file is in the current working directory, while the chart structure shows it inside the `dapr-app/` directory. This is ambiguous but a common convention in tutorials.

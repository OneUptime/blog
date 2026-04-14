# Validation Summary: How to Send Dapr Logs to New Relic

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (sidecar annotations, JSON logging)
- New Relic (log management, NRQL, NerdGraph API, dashboards, alerts)
- Kubernetes (pod annotations, ConfigMaps, DaemonSets)
- Fluent Bit (log collection, filters)
- Helm 3 (nri-bundle chart)

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- New Relic nri-bundle Helm chart: https://github.com/newrelic/helm-charts/tree/master/charts/nri-bundle
- New Relic newrelic-logging chart: https://github.com/newrelic/helm-charts/tree/master/charts/newrelic-logging
- New Relic Kubernetes log forwarding docs: https://docs.newrelic.com/docs/logs/forward-logs/kubernetes-plugin-log-forwarding/
- New Relic NRQL syntax reference: https://docs.newrelic.com/docs/nrql/nrql-syntax-clauses-functions/
- New Relic CLI (newrelic-cli) GitHub: https://github.com/newrelic/newrelic-cli
- New Relic NerdGraph alertsNrqlConditionStaticCreate: https://docs.newrelic.com/docs/apis/nerdgraph/examples/nerdgraph-api-nrql-condition-alerts/
- New Relic NerdGraph dashboard API: https://docs.newrelic.com/docs/apis/nerdgraph/examples/nerdgraph-dashboards/
- Fluent Bit Kubernetes filter: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Fluent Bit Modify filter: https://docs.fluentbit.io/manual/data-pipeline/filters/modify

## Issues Found

### 1. NRQL queries used `containerName` instead of `container_name`
- **What was wrong:** All NRQL queries and the summary paragraph used `containerName` (camelCase) to filter Dapr sidecar logs. The Fluent Bit Kubernetes filter produces snake_case field names (`container_name`, `pod_name`, `namespace_name`), and the New Relic `Log` event type uses `container_name` for Kubernetes container log attributes.
- **What was changed:** Replaced `containerName` with `container_name` in all three NRQL queries (Steps 4), the dashboard JSON (Step 6), and the Summary section.
- **Why:** Queries using `containerName` would return no results since the field doesn't exist under that name in the `Log` event type.

### 2. New Relic CLI alert command was invalid
- **What was wrong:** The command `newrelic alerts conditions create` does not exist in the official New Relic CLI (`newrelic-cli`). The CLI has no `alerts` subcommand. The flags (`--policy-id`, `--name`, `--type`, `--query`, `--threshold`, `--threshold-duration`, `--threshold-occurrences`) and the type `logs_static` were also fabricated.
- **What was changed:** Replaced the CLI command with a NerdGraph `alertsNrqlConditionStaticCreate` GraphQL mutation, which is the correct programmatic way to create NRQL alert conditions in New Relic.
- **Why:** The original command would fail immediately as the subcommand doesn't exist. NerdGraph is New Relic's official API for alert condition management.

### 3. Dashboard JSON structure was incomplete and incorrectly nested
- **What was wrong:** The dashboard JSON was missing required fields (`permissions`, `visualization`, `layout`, `accountId`) and had `nrqlQueries` placed directly inside the widget instead of inside `rawConfiguration`.
- **What was changed:** Added `permissions: "PUBLIC_READ_WRITE"` to the dashboard, `visualization`, `layout`, and `rawConfiguration` wrapper to the widget, and `accountId` placeholder inside the query object.
- **Why:** The original JSON would fail the NerdGraph `dashboardCreate` mutation validation due to missing required fields.

## Review Notes
- The `newrelic-infrastructure.enabled=true` and `newrelic-logging.fluentBit.criEnabled=true` Helm values are redundant (they match chart defaults), but explicitly stating them is reasonable for tutorial clarity.
- The Fluent Bit match pattern `kube.*daprd*` is broad and could match non-sidecar containers with "daprd" in their name, but this is acceptable for most deployments.
- The `accountId` field in the dashboard JSON and NerdGraph mutation uses a placeholder; readers will need to substitute their own account ID.

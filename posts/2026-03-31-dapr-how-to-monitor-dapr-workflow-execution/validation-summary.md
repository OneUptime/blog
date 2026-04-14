# Validation Summary: How to Monitor Dapr Workflow Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Workflow API (HTTP management API)
- Dapr .NET SDK (DaprClient, WorkflowContext)
- Dapr CLI (`dapr workflow` subcommands)
- OpenTelemetry tracing with Zipkin
- Prometheus metrics
- Grafana dashboards and alerting
- Python (polling monitor example)

## Sources Consulted
- Dapr Workflow API Reference: https://docs.dapr.io/reference/api/workflow_api
- Dapr How to: Manage Workflows: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr Workflow CLI Reference: https://docs.dapr.io/reference/cli/dapr-workflow/
- Dapr Prometheus Metrics: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr Metrics (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Zipkin Tracing Configuration: https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr .NET SDK Workflow Documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-workflow/
- Dapr Kubernetes Annotations: https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found

1. **Incorrect Dapr CLI command `dapr workflow history`**: The subcommand `history` does not exist in the Dapr CLI. Changed to `dapr workflow get`, which is the correct command to retrieve workflow instance information.

2. **Incorrect CLI syntax for `terminate` and `purge`**: The post used `--workflow-id` as a named flag, but the Dapr CLI expects the instance ID as a positional argument. Changed from `dapr workflow terminate --app-id orderservice --workflow-id order-workflow-abc123` to `dapr workflow terminate order-workflow-abc123 --app-id orderservice` (and same for `purge`).

3. **Incorrect Prometheus metric names**: All four metric names were missing the `runtime_` prefix. Fixed:
   - `dapr_workflow_operation_count` → `dapr_runtime_workflow_operation_count`
   - `dapr_workflow_operation_latency` → `dapr_runtime_workflow_operation_latency`
   - `dapr_activity_operation_count` → `dapr_runtime_workflow_activity_operation_count`
   - `dapr_activity_operation_latency` → `dapr_runtime_workflow_activity_operation_latency`
   
   The Grafana query and Prometheus alert rule were also updated to use the corrected metric names.

## Review Notes
- The Runtime Status Values table is not exhaustive — it omits `CONTINUED_AS_NEW`, `CANCELED`, and `PENDING`. This is acceptable since the table covers the most common statuses, but readers should be aware additional statuses exist.
- The .NET code examples use correct SDK APIs (`GetWorkflowAsync`, `SetCustomStatus`, `WorkflowRuntimeStatus.Completed`, `ReadOutputAs<T>`).
- The tracing configuration YAML and `dapr.io/config` annotation are correct per Dapr docs.
- The Python polling monitor correctly uses the workflow HTTP API endpoint and handles the response structure accurately.
- The `app_id` parameter in the Python function is accepted but unused in the HTTP call (the Dapr sidecar API on localhost:3500 is already scoped to the app). This is a minor design note, not an error.

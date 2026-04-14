# Validation Summary: How to Trace Workflow Execution in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Workflows (Python SDK, `dapr-ext-workflow`)
- Dapr Configuration (tracing with OpenTelemetry)
- Jaeger (trace visualization and querying)
- OpenTelemetry Collector

## Sources Consulted
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Python SDK workflow extension: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr Python SDK examples (workflow): https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py
- Dapr configuration overview (tracing): https://docs.dapr.io/operations/configuration/configuration-overview/
- Jaeger APIs documentation: https://www.jaegertracing.io/docs/1.56/apis/

## Issues Found

1. **Deprecated workflow start API**: The "Starting a Workflow" section used `DaprClient.start_workflow()`, which is deprecated and removed from the current Dapr Python SDK. Replaced with the current recommended API: `DaprWorkflowClient.schedule_new_workflow()` from `dapr.ext.workflow`. The new method returns the instance ID as a string directly, so the variable assignment is now correct.

2. **Incorrect workflow status API URL**: The curl command for checking workflow status used `/v1.0/workflows/dapr/order-processing-workflow/instance/{instanceId}`, which includes the workflow name and an `/instance/` path segment that do not exist in the Dapr API. Fixed to the correct pattern: `/v1.0/workflows/dapr/{instanceId}` (only workflow component name and instance ID).

3. **Incorrect Jaeger query API path**: The "Analyzing Failed Workflows" section used `/api/v2/traces` for the Jaeger query endpoint. There is no `/api/v2/traces` endpoint in the Jaeger query service. Fixed to `/api/traces`, which is the standard (though intentionally undocumented) HTTP query API on port 16686.

## Review Notes
- The Jaeger HTTP query API (`/api/traces`) is intentionally undocumented by the Jaeger project and subject to change. The stable alternative is the gRPC `jaeger.api_v2.QueryService` on port 16685, or the newer `/api/v3/*` OTLP-based endpoints. This is worth noting but not a blog error per se.
- The Jaeger `tags` query parameter format `tags=error:true` may need to be JSON-encoded (`tags={"error":"true"}`) depending on the Jaeger version. The simplified format shown is commonly used in examples but may not work in all configurations.
- The Dapr Configuration YAML, workflow definition pattern (`@wf_runtime.workflow`, `yield ctx.call_activity`), and activity registration are all correct per current Dapr documentation.
- The trace span hierarchy and correlation concepts described are accurate representations of how Dapr workflow tracing works.

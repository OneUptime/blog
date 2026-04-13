# Validation Summary: How to Debug Dapr Workflows

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Dapr Workflows (workflow building block)
- Dapr CLI (`dapr run`)
- Dapr Workflow HTTP API (status, pause, resume)
- Dapr Python SDK (`dapr.ext.workflow`)
- Zipkin distributed tracing
- Kubernetes annotations for Dapr

## Sources Consulted
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Python SDK Workflow extension: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr Zipkin tracing configuration: https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr logs troubleshooting (Kubernetes annotations): https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/
- Dapr Workflow patterns: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-patterns/

## Issues Found
- **Incomplete `runtimeStatus` values list**: The post listed `RUNNING`, `COMPLETED`, `FAILED`, `TERMINATED`, and `PENDING` as the runtime status values but omitted `SUSPENDED`. This status is especially relevant since the post itself covers pause/resume functionality — a paused workflow enters the `SUSPENDED` state. Added `SUSPENDED` to the list.

## Review Notes
- The Dapr Workflow HTTP API endpoints use the stable `v1.0` path (not alpha/beta), which is correct for Dapr v1.15+.
- The `serializedCustomStatus` response field and `set_custom_status()` Python SDK method are not prominently documented in official Dapr docs but are valid features inherited from the underlying Durable Task Framework.
- The `TaskFailedError` exception name comes from the `durabletask` package that underpins Dapr Workflows; it is correct but not explicitly documented in Dapr's own Python SDK reference.
- The `@wf.activity` decorator usage assumes an import alias (`wf`) that is conventional but not shown in the snippet — acceptable for a blog post context.
- The `requests` module is used in the activity example without an explicit import; this is standard practice for blog snippets that focus on the Dapr-specific code.
- All CLI commands, Kubernetes annotations, API endpoints, and tracing configuration YAML are verified as correct.

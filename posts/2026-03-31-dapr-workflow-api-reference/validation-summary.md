# Validation Summary: How to Use the Dapr Workflow API Reference

## Status
validated

## Post Type
Reference

## Technologies Covered
- Dapr Workflow API (HTTP REST)
- Dapr Sidecar (localhost HTTP interface)
- C# / .NET Dapr Workflow SDK (WaitForExternalEventAsync)

## Sources Consulted
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow overview: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr .NET SDK WorkflowContext (WaitForExternalEventAsync method signature)

## Issues Found
1. **Runtime status table was incomplete.** The blog listed 6 of 8 possible `runtimeStatus` values, omitting `CONTINUED_AS_NEW` and `CANCELED`. Added both missing statuses with descriptions to the table.

## Review Notes
- The official Dapr docs include a deprecation notice on the workflow HTTP API (`/v1.0/workflows/...`), stating it will eventually be removed in favor of SDK-based workflow management. The blog does not mention this. Future updates may want to add a note about this deprecation.
- The GET status example response includes a `workflowName` field. While this field is present in actual API responses, it is not explicitly listed in the official API reference documentation. This is not incorrect but worth noting.
- The purge endpoint can only be called on workflows in COMPLETED, FAILED, or TERMINATED states. The blog does not mention this constraint. A future update could add this detail.
- All API endpoint paths, HTTP methods, query parameters, and request/response formats are accurate.
- The C# `WaitForExternalEventAsync<T>` usage is correct per the Dapr .NET SDK.

# Validation Summary: How to Configure Workflow History Retention Policy in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (workflow engine, configuration, sidecar)
- Dapr Python SDK (`dapr.ext.workflow`)
- Python 3
- Redis (as state store and tracking store)
- Kubernetes (CronJob for scheduled cleanup)

## Sources Consulted
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr CLI workflow commands: https://docs.dapr.io/reference/cli/dapr-workflow/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Python SDK source (`dapr-ext-workflow` package): `DaprWorkflowClient`, `WorkflowState`, `WorkflowStatus` classes
- Dapr state store Redis key format documentation

## Issues Found
1. **`runtime_status` compared as plain strings (line 55/69)**: `state.runtime_status` returns a `WorkflowStatus` enum, not a string. Comparing it against raw strings like `"COMPLETED"` would not match. Fixed by importing `WorkflowStatus` from `dapr.ext.workflow` and using `{WorkflowStatus.COMPLETED, WorkflowStatus.FAILED, WorkflowStatus.TERMINATED}` for the terminal states set.

2. **Claim that Dapr has no built-in list API (line 97)**: This is outdated. The Dapr CLI now provides `dapr workflow list` with filtering support. However, the HTTP API and Python SDK still lack a programmatic list method. Fixed the text to accurately reflect that the CLI supports listing but the SDK does not, making the tracking store approach still valid for automated scripts.

3. **Incorrect Redis key pattern `"dapr*"` (lines 148-152)**: Dapr does not prefix Redis keys with `"dapr"`. The default key format is `<appid>||dapr.internal.<namespace>.<appid>.workflow||<instanceId>||<stateKey>`. The `KEYS "dapr*"` pattern would not match workflow keys unless the app ID happens to start with "dapr". Fixed to use `"<appid>||dapr.internal.*"` with a comment to replace `<appid>` with the actual Dapr app ID.

## Review Notes
- The `load_tracked_workflow_ids()` function called in the cleanup script is not defined in that code block. It is implicitly connected to the `get_all_instance_ids()` function defined in the tracking section. This is acceptable as a tutorial pattern but readers may find it confusing.
- The Configuration YAML example shows `maxConcurrentActivityInvocations: 100`, while the official Dapr docs example uses `1000`. The blog's value is valid as a custom setting but differs from the documented default example.
- The blog correctly notes that automatic retention-based purge is planned but not yet broadly available, making the manual purge approach the recommended strategy.
- Using `redis-cli KEYS` in production is generally discouraged for large databases as it blocks the server. `SCAN` would be a safer alternative, though this is acceptable for monitoring/debugging context.

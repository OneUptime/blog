# Validation Summary: How to Implement Data Archival with Dapr State TTL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr State Management (TTL / Time To Live)
- Dapr Python SDK (`dapr-client`)
- Dapr Workflow Python SDK (`dapr.ext.workflow`)
- Dapr Output Bindings (AWS S3)
- Dapr Component Configuration (YAML)
- Dapr CLI

## Sources Consulted
- Dapr State Management TTL documentation (https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/)
- Dapr Python SDK `save_state` API — `state_metadata` parameter for TTL, not `StateOptions.metadata`
- Dapr Workflow Python SDK — `WorkflowRuntime` instance decorators (`@wfr.workflow`, `@wfr.activity`), `WorkflowActivityContext` class
- Dapr Output Bindings API — `invoke_binding` method signature
- Dapr AWS S3 Binding component spec (https://docs.dapr.io/reference/components-reference/supported-bindings/s3/)
- Dapr CLI reference — `dapr workflow` subcommands (https://docs.dapr.io/reference/cli/dapr-workflow/)
- Cross-referenced with other validated Dapr posts in this blog repository

## Issues Found

1. **Incorrect TTL metadata passing in Python SDK `save_state`**: The post used `options=StateOptions(metadata={"ttlInSeconds": str(ttl_seconds)})`. The `StateOptions` class is for concurrency/consistency settings, not metadata. TTL metadata is passed via the `state_metadata` parameter directly: `state_metadata={"ttlInSeconds": str(ttl_seconds)}`. Fixed in the first code example.

2. **Wrong workflow decorator pattern**: The post used `@wf.activity` and `@wf.workflow` as module-level decorators on `dapr.ext.workflow`. These are instance methods on the `WorkflowRuntime` class, not module-level functions. Fixed by creating a `wfr = WorkflowRuntime()` instance and using `@wfr.activity` and `@wfr.workflow`.

3. **Incorrect activity context class name**: The post imported and used `ActivityContext`, which does not exist in the Dapr Workflow Python SDK. The correct class is `WorkflowActivityContext`. Fixed in both the import statement and function signatures.

4. **Non-existent Dapr CLI command**: The post used `dapr workflow history --workflow-id <id> --app-id <app-id>`. The `history` subcommand does not exist. The correct command to inspect a workflow instance is `dapr workflow get <instance-id> --app-id <app-id>`, where the instance ID is a positional argument, not a `--workflow-id` flag. Fixed accordingly.

## Review Notes
- The HTTP API example for setting state TTL via `metadata.ttlInSeconds` is correct.
- The S3 binding component configuration is correct with proper `secretKeyRef` usage.
- The tiered TTL strategy code uses `datetime.utcnow()` which is deprecated in Python 3.12+ in favor of `datetime.now(datetime.UTC)`, but this is a minor note and not an error for current usage.
- The `continue_as_new` pattern for recurring workflow execution is a valid Dapr Workflow pattern.
- The post correctly notes that TTL support depends on the backend state store supporting it natively.

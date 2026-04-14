# Validation Summary: How to Explain Dapr Workflow in an Interview

## Status
validated

## Post Type
Interview preparation guide with code examples

## Technologies Covered
- Dapr Workflow
- Dapr Python SDK (`dapr.ext.workflow`)
- Dapr HTTP API for workflows
- Durable Task Framework
- Temporal (comparison)
- AWS Step Functions (comparison)

## Sources Consulted
- Dapr Workflow Overview — https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr Python Workflow SDK docs — https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr Python SDK GitHub examples — https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py
- Dapr Workflow API Reference — https://docs.dapr.io/reference/api/workflow_api
- Dapr Workflow Patterns docs — https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-patterns/
- Dapr v1.15 release notes (JavaScript SDK support) — https://blog.dapr.io/posts/2025/02/27/dapr-v1.15-is-now-available/
- Temporal Persistence docs — https://docs.temporal.io/temporal-service/persistence
- AWS Step Functions Service Quotas — https://docs.aws.amazon.com/step-functions/latest/dg/service-quotas.html

## Issues Found

1. **Incorrect decorator syntax (all code blocks):** The post used `@wf.workflow()` and `@wf.activity()` as if calling decorators directly on the imported module. In the Dapr Python SDK, decorators are methods on a `WorkflowRuntime` instance. Fixed by adding `wfr = wf.WorkflowRuntime()` and changing all decorators to `@wfr.workflow()` / `@wfr.activity()`.

2. **Incomplete Dapr language support:** The post listed C#, Python, Java, and Go. JavaScript support was added in Dapr v1.15 (February 2025). Updated the comparison table and the core answer text to include JavaScript.

3. **Incomplete Temporal SDK languages:** The comparison table listed only "Go/Java/.NET/PHP" for Temporal. Temporal also has official Python and TypeScript SDKs. Updated to "Go/Java/.NET/Python/TypeScript/PHP".

4. **Incomplete Temporal state backends:** The comparison table listed "Cassandra/MySQL" for Temporal. PostgreSQL is also a fully supported production backend. Updated to "Cassandra/MySQL/PostgreSQL".

5. **Core answer text incomplete:** The introductory answer mentioned only "C#, Python, or Java" as supported languages. Updated to include Go and JavaScript.

## Review Notes
- The Dapr Workflow HTTP API (`/v1.0/workflows/...`) shown in the post is marked as deprecated in current Dapr docs in favor of the SDK-based approach. The endpoints still work but may be removed in a future version. This is worth monitoring for future updates.
- The `wf.when_all()` usage is correct — `when_all` is a module-level function exported from `dapr.ext.workflow`, so calling it as `wf.when_all()` works with the module import alias.
- All other technical claims (determinism requirements, event sourcing replay model, `ctx.current_utc_datetime`, `ctx.wait_for_external_event()`, `ctx.call_activity()`, AWS Step Functions 1-year limit) were verified as accurate.

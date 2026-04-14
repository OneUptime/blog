# Validation Summary: How to Use Dapr for Financial Services Microservices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr-ext-workflow`, `dapr.clients`)
- Dapr Workflow (based on Durabletask)
- Dapr State Management (with ETag-based optimistic concurrency)
- Dapr Service Invocation
- Dapr Pub/Sub and Output Bindings
- Dapr mTLS and Access Control Configuration
- Python / Flask

## Sources Consulted
- Dapr Python SDK source code on GitHub (`dapr/python-sdk`), specifically the `dapr.ext.workflow` module for workflow/activity API verification
- Dapr official documentation for access control configuration (https://docs.dapr.io/operations/configuration/invoke-allowlist/)
- Dapr Python SDK `DaprClient` API for `invoke_method`, `save_state`, `invoke_binding` parameter verification

## Issues Found

1. **Wrong activity context class name**: `ActivityContext` was used but does not exist in `dapr.ext.workflow`. Changed to `WorkflowActivityContext`, which is the correct public API class.

2. **Wrong decorator pattern**: `@wf.activity` and `@wf.workflow` used module-level decorators that don't exist. The correct pattern requires instantiating a `WorkflowRuntime()` and using instance method decorators (`@wfr.activity(name='...')` and `@wfr.workflow(name='...')`). Fixed all five decorator usages.

3. **Missing imports**: The payment workflow code block used `DaprClient` and `json` without importing them. Added `from dapr.clients import DaprClient` and `import json`. Also added `WorkflowRuntime` to the import from `dapr.ext.workflow`.

4. **Wrong YAML field names in access control configuration**: Three field names were incorrect per Dapr's Configuration spec:
   - `httpPolicies` changed to `operations`
   - `path` changed to `name`
   - `methods` changed to `httpVerb`

## Review Notes
- The `reverse_debit` and `publish_audit_event` activities are referenced in the workflow but not defined in the code snippet. This is acceptable for a blog post (they are implied helper activities), but readers may need to implement them.
- The audit service code snippet omits its imports (Flask, uuid, datetime, json, DaprClient) which is typical for secondary code blocks in blog posts, but readers should be aware they need these imports.
- The `datetime.utcnow()` call in the audit service is deprecated in Python 3.12+ in favor of `datetime.now(datetime.UTC)`, but still functional.

# Validation Summary: How to Use Dapr Workflow for Infrastructure Provisioning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (Python SDK)
- Python
- Kubernetes (Python client library)
- Terraform
- Dapr HTTP API (workflow start and status endpoints)

## Sources Consulted
- Dapr Workflow API Reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Python SDK Workflow Extension: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/
- Dapr How-to: Author a Workflow: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr How-to: Manage Workflows: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Kubernetes Python Client documentation: https://github.com/kubernetes-client/python

## Issues Found

1. **Workflow start API URL missing `/start` path segment**: The curl command to start a workflow used `POST .../v1.0/workflows/dapr/provision_tenant_workflow` but the Dapr Workflow HTTP API requires a `/start` suffix. Fixed to `POST .../v1.0/workflows/dapr/provision_tenant_workflow/start`.

2. **Workflow status API URL incorrectly included workflow name**: The monitoring script used `.../v1.0/workflows/dapr/provision_tenant_workflow/{id}` but the Dapr status endpoint only requires the component name and instance ID, not the workflow name. Fixed to `.../v1.0/workflows/dapr/{instanceId}`.

3. **Missing `import os` in `provision_database` activity**: The function used `os.makedirs()` but only imported `subprocess` and `json`. Added `os` to the import statement.

## Review Notes
- The `@wf.activity` decorator pattern shown is a simplification. In practice, activities are typically registered via a `WorkflowRuntime` instance (e.g., `@wfr.activity(name='...')`). This is acceptable for a conceptual tutorial but readers building a real application should refer to the official SDK examples for the full registration pattern.
- The `set_custom_status()` method was introduced in Dapr v1.15. Readers using earlier versions may not have access to this feature.
- The rollback logic is implemented as manual compensating actions rather than using a try/except with a centralized cleanup. This is a valid saga pattern but becomes harder to maintain as more steps are added.

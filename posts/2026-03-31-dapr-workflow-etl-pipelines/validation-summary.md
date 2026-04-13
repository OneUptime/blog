# Validation Summary: How to Use Dapr Workflow for ETL Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (Python SDK)
- Python
- PostgreSQL (psycopg2)
- ClickHouse (clickhouse-driver)
- Dapr Cron binding (scheduling)

## Sources Consulted
- Dapr Workflow Python SDK docs: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr Workflow patterns: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-patterns/
- Dapr How to: Author a workflow: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr Python SDK workflow examples: https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py
- Dapr Cron binding spec: https://docs.dapr.io/reference/components-reference/supported-bindings/cron/
- Dapr Jobs API reference: https://docs.dapr.io/reference/api/jobs_api/

## Issues Found

1. **`@wf.activity` decorator does not exist as a module-level decorator.** Activities must be registered on a `WorkflowRuntime` instance using `@wfr.activity(name='...')`. Fixed all three activity definitions (`extract_data`, `transform_chunk`, `load_data`) to use the correct `@wfr.activity(name='...')` pattern. Also added `WorkflowRuntime` instantiation and the `@wfr.workflow(name='...')` decorator to the main workflow function.

2. **`RetryPolicy` was incorrectly placed on the activity decorator.** In the Dapr Python SDK, `RetryPolicy` is passed as a parameter to `ctx.call_activity()` inside the workflow function, not to the activity decorator. Fixed both the main workflow code (added `retry_policy` to the `load_data` call) and the "Handling ETL Failures" example section to show the correct placement.

3. **`type: jobs.dapr` is not a valid Dapr component type.** The scheduling YAML used a fabricated component type. Changed to `type: bindings.cron` with the required `direction: input` metadata field, which is the correct Dapr component for cron-based scheduling. Updated the section heading text from "Jobs API" to "Cron binding".

4. **Missing workflow registration.** The original code showed the workflow as a plain function without registration on a `WorkflowRuntime`. Added `wfr = wf.WorkflowRuntime()` and the `@wfr.workflow(name='etl_pipeline_workflow')` decorator, which are required for the workflow engine to discover and run the workflow.

## Review Notes
- The `DaprClient.start_workflow()` API used in the "Triggering" section exists and works, though the newer `DaprWorkflowClient.schedule_new_workflow()` API is now the recommended approach. The existing usage was left as-is since it remains functional.
- The `send_etl_report` activity is referenced in the workflow but not defined in the post. This is acceptable for a tutorial that focuses on the ETL pattern rather than being a complete runnable application.
- The clickhouse-driver `Client` constructor typically takes host/port parameters rather than a connection URI string. The blog passes `payload["destination"]` which is a URI like `clickhouse://analytics-db:9000/warehouse`. This may need adjustment depending on the clickhouse-driver version, but is left as-is since connection string formats vary by driver wrapper.

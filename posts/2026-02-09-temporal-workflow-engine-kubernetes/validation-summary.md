# Validation Summary: How to Deploy Temporal Workflow Engine on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Temporal
- Kubernetes
- Helm
- PostgreSQL
- Python
- Temporal Python SDK
- Flask

## Sources Consulted
- Temporal Helm chart README: https://github.com/temporalio/helm-charts
- Temporal Helm chart values.yaml: https://github.com/temporalio/helm-charts/blob/master/charts/temporal/values.yaml
- Temporal Helm chart service template: https://github.com/temporalio/helm-charts/blob/master/charts/temporal/templates/server-service.yaml
- Temporal Python SDK README: https://github.com/temporalio/sdk-python
- Temporal Python SDK API reference for WorkflowHandle: https://python.temporal.io/temporalio.client.WorkflowHandle.html
- Temporal Python SDK API reference for WorkflowExecutionDescription: https://python.temporal.io/temporalio.client.WorkflowExecutionDescription.html
- Temporal API RetryPolicy reference: https://api-docs.temporal.io/

## Issues Found
- The Helm persistence flags used the older direct `server.config.persistence.default.sql.*` shape. Updated them to the current `server.config.persistence.datastores.default.sql.*` and `server.config.persistence.datastores.visibility.sql.*` values expected by the official chart.
- The Helm command configured only the default persistence store. Added a visibility store configuration, which Temporal requires.
- The Web UI installation used a separate `temporalio/temporal-web` chart. The current official chart deploys the Web UI as part of the Temporal release, so the snippet now shows port-forwarding to the `temporal-web` service.
- The Python workflow passed retry policy as a dictionary. The Temporal Python SDK expects a `RetryPolicy` object, so the snippet now imports and uses `temporalio.common.RetryPolicy`.
- The order workflow called `refund_payment` but did not define or register it with the worker. Added the missing activity and included it in the worker activity list.
- The worker deployment set `TEMPORAL_ADDRESS`, but the worker code ignored it. Updated the worker to read the environment variable with a sensible default.
- The order status endpoint awaited `handle.result()`, which blocks until workflow completion instead of returning current status. Updated it to use `handle.describe()` and return the workflow execution status.
- The approval workflow referenced `asyncio`, `send_approval_email`, and `process_approved_request` without importing or defining them. Added the missing import and activity definitions.
- The approval workflow initialized `approved` to `False` and waited for `lambda: self.approved`, which meant a reject signal would not wake the workflow. Changed the state to start as `None` and wait until approval is either `True` or `False`.
- The approval signal example referenced `Client` without importing it. Added the missing import.

## Review Notes
- The Helm example still assumes PostgreSQL databases and credentials already exist or can be created by the chart's schema jobs, depending on the external PostgreSQL setup.
- The tutorial uses simple Flask examples for clarity. In production, reusing a Temporal client instead of creating one per request would be more efficient.

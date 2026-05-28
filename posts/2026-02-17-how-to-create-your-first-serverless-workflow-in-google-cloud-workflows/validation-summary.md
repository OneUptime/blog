# Validation Summary: How to Create Your First Serverless Workflow in Google Cloud Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Workflows
- Google Cloud CLI
- Workflows YAML syntax
- Workflows Executions API and Python client library
- Cloud Scheduler
- Document AI REST API
- Firestore REST API
- Cloud Logging

## Sources Consulted
- Google Cloud Workflows syntax overview: https://docs.cloud.google.com/workflows/docs/reference/syntax
- Google Cloud Workflows conditions syntax: https://docs.cloud.google.com/workflows/docs/reference/syntax/conditions
- Google Cloud Workflows lists syntax and `list.concat`: https://docs.cloud.google.com/workflows/docs/reference/syntax/lists
- Google Cloud Workflows execution with client libraries: https://docs.cloud.google.com/workflows/docs/execute-workflow-client-libraries
- Google Cloud SDK `gcloud workflows run` reference: https://docs.cloud.google.com/sdk/gcloud/reference/workflows/run
- Cloud Scheduler workflow scheduling guide: https://docs.cloud.google.com/scheduler/docs/tut-workflows
- Document AI `processors.process` REST reference: https://cloud.google.com/document-ai/docs/reference/rest/v1/projects.locations.processors/process
- Document AI `GcsDocument` REST reference: https://docs.cloud.google.com/document-ai/docs/reference/rest/v1/GcsDocument
- Firestore `createDocument` REST reference: https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/createDocument
- Workflows `sys.log` reference and Cloud Logging resource notes: https://docs.cloud.google.com/workflows/docs/reference/stdlib/sys/log

## Issues Found
- The first workflow description said the workflow logs the result, but the YAML returns the result and does not call `sys.log`. Changed the text to say it returns the result.
- The premium-customer `switch` branch used `assign` directly inside a switch condition. Workflows switch branches should use `next` or nested `steps` for embedded execution. Wrapped the assignment in a nested `steps` block.
- The input-validation `switch` branch used `raise` directly inside a switch condition. Wrapped the raise in a nested `steps` block to match the documented embedded-step syntax.
- The Document AI request body included both `rawDocument` and `gcsDocument`. The Document AI `processors.process` request uses a union source field, so only one source can be provided. Removed the empty `rawDocument` block and kept `gcsDocument`.

## Review Notes
The examples use placeholder project IDs, processor IDs, and API endpoints where appropriate. The Cloud Scheduler example is valid for a workflow that does not require runtime arguments; workflows that need arguments should include a request body with the `argument` field as shown in Google's scheduling guide.

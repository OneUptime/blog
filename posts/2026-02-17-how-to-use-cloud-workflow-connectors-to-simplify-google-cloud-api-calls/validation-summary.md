# Validation Summary: How to Use Cloud Workflow Connectors to Simplify Google Cloud API Calls

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Workflows
- Workflows connectors
- BigQuery API
- Firestore API
- Pub/Sub API
- Cloud Storage API
- Secret Manager API
- Cloud Tasks API
- Workflows YAML syntax and standard library functions

## Sources Consulted
- Google Cloud Workflows connectors reference: https://cloud.google.com/workflows/docs/reference/googleapis
- Google Cloud Workflows "Understand connectors": https://cloud.google.com/workflows/docs/connectors
- BigQuery Workflows connector `jobs.query`: https://cloud.google.com/workflows/docs/reference/googleapis/bigquery/v2/jobs/query
- BigQuery Workflows connector `tabledata.insertAll`: https://cloud.google.com/workflows/docs/reference/googleapis/bigquery/v2/tabledata/insertAll
- BigQuery REST API `jobs.query`: https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
- Firestore Workflows connector `createDocument`: https://cloud.google.com/workflows/docs/reference/googleapis/firestore/v1/projects.databases.documents/createDocument
- Firestore Workflows connector `patch`: https://cloud.google.com/workflows/docs/reference/googleapis/firestore/v1/projects.databases.documents/patch
- Pub/Sub Workflows connector `projects.topics.publish`: https://cloud.google.com/workflows/docs/reference/googleapis/pubsub/v1/projects.topics/publish
- Pub/Sub REST API `projects.topics.publish`: https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.topics/publish
- Cloud Storage Workflows connector `objects.copy`: https://cloud.google.com/workflows/docs/reference/googleapis/storage/v1/objects/copy
- Secret Manager Workflows connector overview: https://cloud.google.com/workflows/docs/reference/googleapis/secretmanager/Overview
- Cloud Tasks Workflows connector `tasks.create`: https://cloud.google.com/workflows/docs/reference/googleapis/cloudtasks/v2/projects.locations.queues.tasks/create
- Workflows standard library overview: https://cloud.google.com/workflows/docs/reference/stdlib/overview
- Workflows `sys.now`: https://cloud.google.com/workflows/docs/reference/stdlib/sys/now
- Workflows `time.format`: https://cloud.google.com/workflows/docs/reference/stdlib/time/format
- Workflows `json.encode`: https://cloud.google.com/workflows/docs/reference/stdlib/json/encode
- Workflows `list.concat`: https://cloud.google.com/workflows/docs/reference/stdlib/list/concat

## Issues Found
- BigQuery examples used `my-dataset.my-table` in SQL. BigQuery dataset IDs use letters, numbers, and underscores, so the sample dataset ID with a hyphen would not be valid. Changed the examples to `my_dataset.my_table`.
- Firestore patch examples used `updateMask.fieldPaths: ["status"]`. The Workflows connector reference documents `updateMask.fieldPaths` as a string parameter. Changed both examples to `fieldPaths: "status"`.
- Cloud Storage `objects.copy` omitted the required `body` argument. Added `body: {}`.
- Cloud Storage copy examples passed object names that can contain `/` without URL encoding. The connector documentation warns that object names must be URL-encoded to be path safe. Wrapped `sourceObject` and `destinationObject` with `text.url_encode(...)`.
- Cloud Tasks example used `duration.value(30, "SECONDS")`, but Workflows does not provide a `duration` standard library module. Replaced it with `sys.now() + 30`, which matches `sys.now` returning Unix seconds and `time.format` accepting seconds since epoch.

## Review Notes
The connector names, argument structure, automatic connector authentication claim, Secret Manager `accessString` usage, Pub/Sub Base64 JSON encoding pattern, and Cloud Tasks `tasks.create` structure match current Google Cloud documentation. The examples still assume that required APIs are enabled and that the workflow service account has the relevant IAM permissions.

# Validation Summary: How to Migrate Azure Logic Apps Workflows to Google Cloud Workflows

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Logic Apps
- Google Cloud Workflows
- Google Cloud Scheduler
- Google Cloud CLI
- Azure CLI
- Cloud Firestore
- Cloud Storage JSON API
- Microsoft Graph API
- Slack webhooks

## Sources Consulted
- Azure Logic Apps built-in connectors documentation: https://learn.microsoft.com/en-us/azure/connectors/built-in
- Azure Logic Apps overview and Standard workflow behavior: https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-overview
- Azure CLI `az logic workflow` reference: https://learn.microsoft.com/en-us/cli/azure/logic/workflow?view=azure-cli-latest
- Google Cloud Workflows pricing: https://cloud.google.com/workflows/pricing
- Google Cloud Workflows `http.get` standard library reference: https://docs.cloud.google.com/workflows/docs/reference/stdlib/http/get
- Google Cloud Workflows `sys.now` standard library reference: https://docs.cloud.google.com/workflows/docs/reference/stdlib/sys/now
- Google Cloud Workflows Firestore connector `documents.patch` reference: https://docs.cloud.google.com/workflows/docs/reference/googleapis/firestore/v1/projects.databases.documents/patch
- Cloud Firestore REST `Value` type reference: https://docs.cloud.google.com/firestore/docs/reference/rest/v1/Value
- Google Cloud CLI `gcloud scheduler jobs create http` reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Google Cloud CLI `gcloud workflows deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/workflows/deploy
- Google Cloud CLI `gcloud workflows run` reference: https://docs.cloud.google.com/sdk/gcloud/reference/workflows/run

## Issues Found
- The post described Logic Apps as having "hundreds of built-in connectors" and the table said "400+ built-in connectors." Microsoft distinguishes built-in connectors from managed connectors, so I changed this to "prebuilt connectors" and "prebuilt built-in and managed connectors."
- The Cloud Workflows connector comparison said only "HTTP calls to any API." Google Cloud Workflows also has Google Cloud connectors, so I updated the table to include both HTTP calls and Google Cloud connectors.
- The first Cloud Workflows HTTP example referenced `apiKey` without defining it. I added an `input` parameter and changed the reference to `input.apiKey`.
- The Cloud Storage example referenced `objectName` without defining it. I added an `objectName` parameter.
- The Firestore state example stored `sys.now()` in a Firestore `stringValue`, but `sys.now()` returns a floating-point Unix timestamp. I changed the field to `doubleValue`.

## Review Notes
The CLI tools `gcloud` and `az` were not installed in the local environment, so command validation was performed against the official Google Cloud CLI and Azure CLI reference documentation. The sample commands use placeholder project IDs, service accounts, API URLs, and webhook URLs; users still need matching IAM permissions, enabled APIs, and real resource names for execution.

# Validation Summary: How to Migrate Azure Functions to Google Cloud Functions with Runtime Parity

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Functions
- Azure Functions triggers and bindings
- Azure CLI
- Google Cloud Functions / Cloud Run functions
- Functions Framework for Node.js and Python
- Google Cloud CLI
- Cloud Scheduler
- Pub/Sub
- Cloud Storage
- Firestore
- Secret Manager

## Sources Consulted
- Azure Functions supported languages: https://learn.microsoft.com/en-us/azure/azure-functions/supported-languages
- Azure Functions runtime versions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-versions
- Azure Functions triggers and bindings concepts: https://learn.microsoft.com/en-us/azure/azure-functions/functions-triggers-bindings
- Azure Functions timer trigger: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer
- Azure Functions Service Bus trigger: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus-trigger
- Azure CLI function app commands: https://learn.microsoft.com/en-us/cli/azure/functionapp
- Azure CLI function commands: https://learn.microsoft.com/en-us/cli/azure/functionapp/function
- Cloud Run functions runtimes: https://cloud.google.com/functions/docs/concepts/function-runtimes
- Cloud Run functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Write HTTP Cloud Run functions: https://cloud.google.com/run/docs/write-http-functions
- Cloud Storage CloudEvent sample: https://cloud.google.com/functions/docs/samples/functions-cloudevent-storage
- Google Cloud CLI functions deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud CLI functions describe reference: https://cloud.google.com/sdk/gcloud/reference/functions/describe
- Google Cloud CLI functions add-invoker-policy-binding reference: https://cloud.google.com/sdk/gcloud/reference/functions/add-invoker-policy-binding
- Cloud Run functions authentication for invocation: https://cloud.google.com/functions/docs/securing/authenticating
- Cloud Scheduler HTTP job creation: https://cloud.google.com/scheduler/docs/creating
- Google Cloud CLI scheduler HTTP job reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Cloud Scheduler HTTP target authentication: https://cloud.google.com/scheduler/docs/http-target-auth

## Issues Found
- The Cloud Scheduler example deployed the HTTP function as authenticated and configured Scheduler to send an OIDC token, but did not grant the Scheduler service account permission to invoke the 2nd gen function. Added a `gcloud functions add-invoker-policy-binding` command for the Scheduler service account, because 2nd gen functions require the invoker principal to have Cloud Run Invoker permission.

## Review Notes
- The Azure JavaScript examples use the function.json-style programming model, which is still relevant for existing Azure Functions migrations. New Azure Functions Node.js projects may use the newer v4 programming model.
- Google Cloud documentation now often labels the product surface as Cloud Run functions while still documenting `gcloud functions` and Cloud Functions v2 APIs. The post's use of Google Cloud Functions / Cloud Functions 2nd gen remains understandable for migration readers.

# Validation Summary: How to Call Cloud Functions and Cloud Run Services from a Cloud Workflow

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Workflows
- Cloud Functions / Cloud Run functions
- Cloud Run
- Workflows HTTP calls
- Workflows OIDC and OAuth2 authentication
- Google Cloud CLI
- Firestore REST API

## Sources Consulted
- Google Cloud Workflows: Make authenticated requests from a workflow: https://cloud.google.com/workflows/docs/authenticate-from-workflow
- Google Cloud Workflows: Invoke Cloud Run functions or Cloud Run: https://cloud.google.com/workflows/docs/calling-run-functions
- Google Cloud Workflows HTTP POST standard library reference: https://cloud.google.com/workflows/docs/reference/stdlib/http/post
- Google Cloud Workflows HTTP GET standard library reference: https://cloud.google.com/workflows/docs/reference/stdlib/http/get
- Google Cloud Workflows catch errors syntax: https://cloud.google.com/workflows/docs/reference/syntax/catching-errors
- Google Cloud Workflows raise errors syntax: https://cloud.google.com/workflows/docs/reference/syntax/raising-errors
- Google Cloud Workflows conditions syntax: https://cloud.google.com/workflows/docs/reference/syntax/conditions
- Google Cloud Workflows iteration syntax: https://cloud.google.com/workflows/docs/reference/syntax/iteration
- Google Cloud Workflows expressions and data types: https://cloud.google.com/workflows/docs/reference/syntax/expressions and https://cloud.google.com/workflows/docs/reference/syntax/datatypes
- Google Cloud Workflows connectors overview: https://cloud.google.com/workflows/docs/connectors
- Google Cloud Workflows connectors reference: https://cloud.google.com/workflows/docs/reference/googleapis
- gcloud functions add-invoker-policy-binding reference: https://cloud.google.com/sdk/gcloud/reference/functions/add-invoker-policy-binding
- gcloud run services add-iam-policy-binding reference: https://cloud.google.com/sdk/gcloud/reference/run/services/add-iam-policy-binding
- gcloud workflows deploy reference: https://cloud.google.com/sdk/gcloud/reference/workflows/deploy
- Cloud Run functions overview: https://cloud.google.com/functions

## Issues Found
- The post said Cloud Functions Gen2 are HTTP-triggered by default. Cloud Functions / Cloud Run functions can be HTTP-triggered or event-triggered, so the wording was changed to refer specifically to HTTP-triggered Gen2 functions exposing an HTTPS endpoint.
- The first workflow example checked `function_response.code >= 400` after `http.post`. Workflows raises `HttpError` for HTTP status codes 400 and higher, so that branch would not run. The example now uses `try`/`except` to catch `HttpError` and then separately handles successful non-2xx responses.
- Several Workflows YAML expressions contained colons inside string literals without wrapping the entire expression in single quotes. Google recommends quoting those expressions to avoid YAML interpreting the colon as map syntax, so the affected expressions were quoted.
- The connectors section implied connectors are the replacement for direct HTTP invocation of Cloud Functions and Cloud Run services. Official Workflows documentation distinguishes API operations through connectors from invoking Cloud Run functions or Cloud Run services, which is done through HTTP requests. The section text was corrected.
- The testing section said to validate the workflow locally, but the example command deploys the workflow and the API validates syntax during deployment. The heading and sentence were corrected.

## Review Notes
The examples use placeholder project IDs, service names, URLs, and function-specific response bodies, so they still require replacement with real deployed services and matching payload schemas. `gcloud` was not installed in the review environment, so CLI commands were verified against official Google Cloud SDK reference documentation rather than local `--help` output.

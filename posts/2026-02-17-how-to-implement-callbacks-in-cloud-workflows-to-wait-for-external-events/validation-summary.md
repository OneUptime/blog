# Validation Summary: How to Implement Callbacks in Cloud Workflows to Wait for External Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Workflows
- Workflows callback endpoints
- Workflows standard library functions
- Google Cloud CLI
- Cloud Logging
- IAM authentication and authorization
- HTTP callbacks with curl

## Sources Consulted
- Google Cloud Workflows: Wait using callbacks: https://docs.cloud.google.com/workflows/docs/creating-callback-endpoints
- Google Cloud Workflows standard library: events.create_callback_endpoint: https://docs.cloud.google.com/workflows/docs/reference/stdlib/events/create_callback_endpoint
- Google Cloud Workflows standard library: events.await_callback: https://docs.cloud.google.com/workflows/docs/reference/stdlib/events/await_callback
- Google Cloud Workflows syntax: Catch errors: https://docs.cloud.google.com/workflows/docs/reference/syntax/catching-errors
- Google Cloud Workflows syntax: Workflow errors: https://docs.cloud.google.com/workflows/docs/reference/syntax/error-types
- Google Cloud Workflows built-in environment variables: https://docs.cloud.google.com/workflows/docs/reference/environment-variables
- Google Cloud CLI reference: gcloud workflows deploy: https://docs.cloud.google.com/sdk/gcloud/reference/workflows/deploy
- Google Cloud CLI reference: gcloud workflows execute: https://docs.cloud.google.com/sdk/gcloud/reference/workflows/execute
- Google Cloud CLI reference: gcloud workflows executions list: https://docs.cloud.google.com/sdk/gcloud/reference/workflows/executions/list
- Google Cloud CLI reference: gcloud logging read: https://docs.cloud.google.com/sdk/gcloud/reference/logging/read

## Issues Found
- The prerequisites and authentication section incorrectly implied that the workflow runtime service account must have the `workflows.invoker` role. Official documentation states that the caller invoking the callback endpoint needs the `workflows.callbacks.send` permission, which is included in the Workflows Invoker role. Updated both sections to assign that permission requirement to the caller identity.
- The timeout handling example checked `e.code == 408`, but `events.await_callback` raises a `TimeoutError`, and Workflows error handling identifies errors through tags such as `"TimeoutError" in e.tags`. Updated the example to check the error tag.

## Review Notes
The callback workflow syntax, callback response access pattern, supported HTTP method configuration, timeout units, execution state description, curl pattern using an OAuth access token, and listed gcloud commands are consistent with the official Google Cloud documentation. Consider avoiding long-term logging of callback URLs in production because they are sensitive operational endpoints even though authenticated access is still required.

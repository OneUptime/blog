# Validation Summary: How to Build a Microservice Orchestration Layer Using Google Cloud Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Workflows
- Cloud Run
- Google Cloud CLI
- Python Google Cloud Workflows client libraries
- Workflows YAML syntax
- HTTP OIDC authentication
- Workflow callbacks, retries, and parallel branches

## Sources Consulted
- Google Cloud Workflows retry syntax: https://docs.cloud.google.com/workflows/docs/reference/syntax/retrying
- Google Cloud Workflows callback endpoints: https://docs.cloud.google.com/workflows/docs/creating-callback-endpoints
- Google Cloud Workflows create_callback_endpoint reference: https://docs.cloud.google.com/workflows/docs/reference/stdlib/events/create_callback_endpoint
- Google Cloud Workflows parallel step variable scope: https://cloud.google.com/workflows/docs/reference/syntax/parallel-steps
- Google Cloud Workflows execution client Python reference: https://docs.cloud.google.com/python/docs/reference/workflows/latest/google.cloud.workflows.executions_v1.services.executions.ExecutionsClient
- Execute Workflows using Cloud Client Libraries: https://docs.cloud.google.com/workflows/docs/execute-workflow-client-libraries
- gcloud workflows deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/workflows/deploy
- gcloud workflows executions list reference: https://docs.cloud.google.com/sdk/gcloud/reference/workflows/executions/list
- gcloud run services add-iam-policy-binding reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/add-iam-policy-binding

## Issues Found
- The workflow retry example used `${default_retry_predicate}`, which is not the documented built-in predicate. Changed it to `${http.default_retry_predicate}` so the custom retry configuration uses the correct Workflows standard-library predicate.
- The callback example called `events.await_callback` with a manually shaped `callback.url` value and referenced `approval_result.body`. Workflows requires a callback endpoint created by `events.create_callback_endpoint`, passes that returned map into `events.await_callback`, and returns the incoming request under `http_request`. Added the callback creation step and changed the approval checks to use `approval_result.http_request.body.approved`.

## Review Notes
- The gcloud commands match the current CLI reference, but `gcloud` is not installed in the local environment, so command verification was performed against official Google Cloud CLI documentation rather than local `--help` output.
- The Python execution sample uses the current `google.cloud.workflows.executions_v1.ExecutionsClient` API shape. In production code, polling until the execution leaves `ACTIVE` is usually more useful than checking once immediately after creation.

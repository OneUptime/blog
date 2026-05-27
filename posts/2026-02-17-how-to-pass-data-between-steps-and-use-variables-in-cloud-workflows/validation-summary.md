# Validation Summary: How to Pass Data Between Steps and Use Variables in Cloud Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Workflows
- Workflows YAML syntax
- Workflows standard library functions
- Google Cloud CLI
- HTTP calls in Workflows

## Sources Consulted
- Google Cloud Workflows syntax overview: https://docs.cloud.google.com/workflows/docs/reference/syntax
- Google Cloud Workflows variables reference: https://docs.cloud.google.com/workflows/docs/reference/syntax/variables
- Google Cloud Workflows expressions reference: https://docs.cloud.google.com/workflows/docs/reference/syntax/expressions
- Google Cloud Workflows conditions reference: https://docs.cloud.google.com/workflows/docs/reference/syntax/conditions
- Google Cloud Workflows iteration reference: https://docs.cloud.google.com/workflows/docs/reference/syntax/iteration
- Google Cloud Workflows runtime arguments reference: https://docs.cloud.google.com/workflows/docs/reference/syntax/runtime-args
- Google Cloud Workflows subworkflows reference: https://docs.cloud.google.com/workflows/docs/reference/syntax/subworkflows
- Google Cloud Workflows HTTP requests guide: https://docs.cloud.google.com/workflows/docs/http-requests
- Google Cloud Workflows http.get reference: https://docs.cloud.google.com/workflows/docs/reference/stdlib/http/get
- Google Cloud Workflows map.get reference: https://docs.cloud.google.com/workflows/docs/reference/stdlib/map/get
- Google Cloud Workflows list.concat reference: https://docs.cloud.google.com/workflows/docs/reference/stdlib/list/concat
- Google Cloud Workflows expression helpers reference: https://docs.cloud.google.com/workflows/docs/reference/stdlib/expression-helpers
- Google Cloud Workflows built-in environment variables reference: https://docs.cloud.google.com/workflows/docs/reference/environment-variables
- gcloud workflows execute reference: https://cloud.google.com/sdk/gcloud/reference/workflows/execute

## Issues Found
- The subworkflow `switch` example placed `assign` directly under each `condition`. Cloud Workflows supports executable statements inside a `switch` condition through a nested `steps` block, so the example was updated to wrap the assignments in named nested steps.
- The `list.concat` loop example passed `[{"server": server, "status": health_response.code}]` as the value to append. `list.concat` appends one element to a copy of the list, so this would append a one-element list and create nested list entries. It was changed to append the map directly: `{"server": server, "status": health_response.code}`.

## Review Notes
The HTTP response body examples assume the API returns a JSON response with an `application/json` media type so Workflows can automatically convert the body to a map. If an API returns JSON without that content type, the body should be decoded explicitly with `json.decode(text.encode(...))`.

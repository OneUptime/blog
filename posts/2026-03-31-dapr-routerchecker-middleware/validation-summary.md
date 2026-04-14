# Validation Summary: How to Use RouterChecker Middleware in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr RouterChecker HTTP middleware (`middleware.http.routerchecker`)
- Dapr CLI (`dapr run`)
- Dapr service invocation API
- Python / Flask
- Kubernetes (Dapr sidecar annotations)
- YAML component and configuration resources

## Sources Consulted
- Dapr RouterChecker middleware official documentation (https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-routerchecker/)
- Dapr components-contrib source code — `middleware/http/routerchecker/routerchecker.go` (https://github.com/dapr/components-contrib/tree/master/middleware/http/routerchecker)
- Dapr CLI reference for `dapr run` (https://docs.dapr.io/reference/cli/dapr-run/)
- Dapr service invocation API reference (https://docs.dapr.io/reference/api/service_invocation_api/)
- Dapr Kubernetes annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr Configuration spec for HTTP pipeline (https://docs.dapr.io/operations/configuration/configuration-overview/)

## Issues Found

1. **Incorrect HTTP status code (3 occurrences):** The post claimed that requests not matching the regex pattern are rejected with a "403 Forbidden" response. The actual Dapr RouterChecker source code returns `http.StatusBadRequest` (400) with the message "invalid router". Changed all three occurrences of "403 Forbidden" to "400 Bad Request" — in the introduction, and in both blocked-path test comments.

2. **Deprecated CLI flag:** The `dapr run` command used `--components-path`, which is deprecated in current versions of Dapr in favor of `--resources-path`. Updated the flag to `--resources-path`.

## Review Notes
- The regex patterns used in examples are valid Go regular expressions, which is what Dapr uses internally (`regexp.Compile`).
- The middleware accepts exactly one metadata field (`rule`), which is correctly shown in all examples.
- The pipeline configuration, Kubernetes annotations, and service invocation URL format are all accurate.
- The Flask application code is syntactically correct and consistent with the allowed paths in the regex pattern.
- The advice to place routerchecker first in the pipeline (before rate limiting) is sound architectural guidance.

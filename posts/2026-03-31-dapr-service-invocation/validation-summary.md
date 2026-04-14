# Validation Summary: How to Use Dapr Service Invocation to Call Other Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation API, CLI, Resiliency resource)
- Python (Flask, requests library, Dapr Python SDK)
- Node.js (Express)
- Go (net/http, encoding/json)
- YAML (Dapr Resiliency configuration)
- mTLS, gRPC (sidecar-to-sidecar communication)

## Sources Consulted
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Service Invocation overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Python SDK (`DaprClient.invoke_method`): https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Resiliency spec: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Flask documentation: https://flask.palletsprojects.com/
- Express.js documentation: https://expressjs.com/
- Go `net/http` package: https://pkg.go.dev/net/http

## Issues Found
No technical issues found.

## Review Notes
- The Go example ignores the error from `json.Marshal` and does not close `resp.Body`, which are resource leak concerns in production code. These are acceptable simplifications for a blog tutorial but could be noted in a future revision.
- The post uses the raw HTTP API for most examples. The Dapr SDK section only covers Python; Go and Node.js SDK examples could be added in a future update for completeness, but this is not a correctness issue.
- All Dapr API paths, CLI flags, SDK method signatures, and Resiliency YAML fields are accurate as of Dapr 1.x stable releases.

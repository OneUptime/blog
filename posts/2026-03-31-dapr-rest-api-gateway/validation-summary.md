# Validation Summary: How to Build a REST API Gateway with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, middleware components, sidecar model)
- Go (Dapr Go SDK `github.com/dapr/go-sdk/client`)
- Gin web framework (`github.com/gin-gonic/gin`)
- Kubernetes (Deployments, annotations)
- Dapr middleware: `middleware.http.ratelimit`, `middleware.http.bearer`
- Dapr Configuration (`httpPipeline`)

## Sources Consulted
- Dapr Go SDK source and documentation on GitHub (`github.com/dapr/go-sdk`) and pkg.go.dev — verified `InvokeMethodWithContent`, `InvokeMethod`, `NewClient`, `DataContent`, and `Client.Close()` signatures.
- Dapr rate limit middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-rate-limit/ — verified `maxRequestsPerSecond` metadata field.
- Dapr bearer token middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-bearer/ — verified `audience`, `issuer`, and `jwksURL` metadata fields.
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/ — verified `httpPipeline.handlers` structure with `name` and `type` fields.
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/ — verified `dapr.io/sidecar-cpu-limit` and `dapr.io/sidecar-memory-limit` annotations.
- Kubernetes apps/v1 Deployment API specification — verified required `spec.selector` field.

## Issues Found
1. **Missing required Kubernetes Deployment fields**: The `spec.selector` and `spec.template.metadata.labels` fields were absent from the Deployment YAML. Since `apps/v1` Deployments require `spec.selector.matchLabels` and corresponding template labels, this manifest would be rejected by the Kubernetes API server. Added `selector.matchLabels.app: api-gateway` and `template.metadata.labels.app: api-gateway`.

## Review Notes
- The Go code passes query parameters as part of the `methodName` argument to `InvokeMethodWithContent` (e.g., `/users/123?fields=name`). While this works in practice because the Dapr sidecar uses the method name to construct the target HTTP URL, it is not explicitly documented as supported behavior. A more robust approach would use the Dapr HTTP API directly for query parameter forwarding, but the current approach is functional.
- The `InvokeMethodWithContent` call ignores the error from `io.ReadAll(c.Request.Body)`. For a production gateway this should be handled, but it is acceptable for a tutorial.
- All Dapr component types, metadata field names, configuration structures, Go SDK API signatures, and Kubernetes annotations are correct and current.

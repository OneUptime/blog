# Validation Summary: How to Use Dapr with OpenFunction Serverless Platform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- OpenFunction (CNCF sandbox serverless FaaS platform)
- Kubernetes
- Knative
- KEDA
- Apache Kafka (as pub/sub broker)
- Redis (as state store)
- Go (functions-framework-go)
- Helm
- Prometheus (metrics)

## Sources Consulted
- OpenFunction functions-framework-go repository: https://github.com/OpenFunction/functions-framework-go
- OpenFunction functions-framework-go context package source: https://github.com/OpenFunction/functions-framework-go/blob/main/context/context.go
- OpenFunction CRD definitions (v1beta1 and v1beta2): https://github.com/OpenFunction/OpenFunction
- OpenFunction Helm charts repository: https://github.com/OpenFunction/charts
- OpenFunction Helm chart index: https://openfunction.github.io/charts/
- Dapr Redis state store documentation: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr metrics source: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- CNCF OpenFunction project page: https://www.cncf.io/projects/openfunction/

## Issues Found

1. **Go code: `ofctx.To()` function does not exist** -- The blog used `ctx.Send(ofctx.To("processed-orders"), in)` but the `To()` function does not exist in the functions-framework-go context package. The `Send` method takes a plain string as its first argument. Fixed to `ctx.Send("processed-orders", in)`.

2. **Go code: Unused `"context"` import** -- The standard library `"context"` package was imported but never used in the function body. In Go, unused imports are compilation errors. Removed the unused import.

3. **Function CRD: apiVersion v1beta2 with v1beta1 fields** -- The Function resource used `apiVersion: core.openfunction.io/v1beta2` but the spec fields (`serving.runtime`, `serving.inputs` with `component` field, `serving.outputs` with `component` field) belong to the v1beta1 API. In v1beta2, the `runtime` field was removed and inputs moved under `serving.triggers.inputs[].dapr`. Changed apiVersion to `v1beta1` to match the fields used.

4. **Inline component type mismatch: `bindings.kafka` used for pub/sub** -- The function subscribes to Kafka topics using pub/sub semantics (inputs/outputs with `topic` fields), but the inline component was defined in a `bindings:` section with `type: bindings.kafka`. Dapr bindings and pub/sub are distinct component types. Changed to a `pubsub:` section with `type: pubsub.kafka` and removed the unnecessary `topics` metadata field (topics are already specified in the inputs/outputs).

## Review Notes
- The Helm install command explicitly sets `global.Dapr.enabled=true` and `global.Keda.enabled=true`, but these are already the default values in the chart. This is not incorrect -- it makes the dependencies explicit -- but readers should know these flags are optional.
- The Redis state store component YAML omits `redisPassword`, which would almost always be needed in a production deployment (the example uses `namespace: production`). The YAML is technically valid since `redisPassword` is optional in the spec, but a production-oriented tutorial might benefit from including it.
- The Dapr metric `dapr_http_server_request_count` is correct, though for async/event-driven functions the gRPC metrics (`dapr_grpc_*`) may be more relevant since Dapr sidecar communication for pub/sub typically uses gRPC.

# Validation Summary: How to Use Dapr for Serverless Event Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub, bindings, workflow building blocks)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Kubernetes
- KEDA (Kubernetes Event-Driven Autoscaling)
- AWS S3 (input binding)
- AWS Kinesis (output binding)
- AWS SQS (KEDA trigger)

## Sources Consulted
- Dapr Go SDK package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK GitHub issues (deprecation of Alpha1 workflow methods): https://github.com/dapr/go-sdk/issues/634
- Dapr Docs — How to Manage Workflows: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr Docs — How to Author a Workflow: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr Docs — Input/Output Bindings: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-bindings/
- Dapr Docs — Cron Binding: https://docs.dapr.io/reference/components-reference/supported-bindings/cron/
- Dapr Docs — AWS S3 Binding: https://docs.dapr.io/reference/components-reference/supported-bindings/s3/
- Dapr Docs — AWS Kinesis Binding: https://docs.dapr.io/reference/components-reference/supported-bindings/kinesis/
- KEDA Docs — ScaledObject spec: https://keda.sh/docs/latest/concepts/scaling-deployments/

## Issues Found

### 1. Missing `"time"` import in Go handler code
- **What was wrong:** The `handleScheduledTrigger` function uses `time.Now().UnixNano()` but the `"time"` package was not included in the import block. This would cause a compilation error.
- **What was changed:** Added `"time"` to the import statement.

### 2. Deprecated `StartWorkflowAlpha1` API
- **What was wrong:** The code used `client.StartWorkflowAlpha1()`, which is a deprecated method in the Dapr Go SDK. Both `StartWorkflowAlpha1` and the underlying Alpha1 gRPC API have been superseded.
- **What was changed:** Updated to `client.StartWorkflowBeta1()`, which is the current supported method in the Dapr Go SDK client package.

## Review Notes
- The Dapr Go SDK is moving toward a dedicated workflow client (`workflow/client.go`) that will eventually replace the `StartWorkflowBeta1` method on the main client. Future updates to this post may need to adopt that newer API once the Beta1 methods are fully removed.
- The architecture diagram uses a `json` code fence for what is plain text. This doesn't affect correctness but could cause syntax highlighting artifacts in some renderers.
- The KEDA ScaledObject uses `keda.sh/v1alpha1` which remains the correct API version for KEDA v2.x.
- Error handling is intentionally minimal throughout the code examples (using `_` for errors), which is acceptable for a tutorial but should not be replicated in production code.

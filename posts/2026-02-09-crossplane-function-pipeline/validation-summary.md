# Validation Summary: How to Build a Crossplane Function Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane Composition Functions
- Crossplane Compositions in pipeline mode
- Crossplane Function packages
- Crossplane CLI rendering
- Crossplane Function SDK for Go
- Crossplane Function SDK for Python
- Kubernetes custom resources
- Prometheus client metrics
- Docker

## Sources Consulted
- Crossplane Compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Functions package documentation: https://docs.crossplane.io/latest/packages/functions/
- Crossplane Function Patch and Transform guide: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane CLI command reference: https://docs.crossplane.io/master/cli/command-reference/
- Crossplane Go Function SDK repository and template: https://github.com/crossplane/function-sdk-go and https://github.com/crossplane/function-template-go
- Crossplane Python Function SDK documentation and template: https://crossplane.github.io/function-sdk-python/ and https://github.com/crossplane/function-template-python
- Go release history: https://go.dev/doc/devel/release

## Issues Found
- The post claimed functions return "modified resources" and can broadly modify existing resources. Updated the explanation to match Crossplane's desired-state model: functions return desired state, can update desired composed resources and composite status, and must preserve desired state they want Crossplane to keep.
- The post implied functions receive the complete composition context including all resources. Clarified that functions receive observed composite and composed resources, desired state, pipeline context, and optional input.
- The Go validation function used the old `proto/v1beta1` import, referenced an undefined `rsp`, imported unused packages, missed required imports, and tried to mutate composite `spec` and metadata. Updated it to `proto/v1`, initialize the response with `response.To`, use current SDK helpers, and write defaults/validation output to composite `status`.
- The Python calculator example used a non-existent high-level `crossplane.function.Function` API. Reworked it to follow the official Python SDK template with `FunctionRunner`, generated protobuf request/response types, `response.to`, and `resource.update_status`.
- The TypeScript example referenced an unsupported `@crossplane/function-sdk` package. Replaced it with a Go SDK example and added an idempotency note for external API calls during reconciliation.
- The conditional resource example used stale SDK identifiers and helper names. Updated it to `proto/v1`, `composed.New()`, and `resource.Name(...)` keys while preserving existing desired resources.
- The deployment section manually created a Kubernetes `Deployment` and `Service` for the function and used `pkg.crossplane.io/v1beta1`. Updated it to the supported Function package flow: build a runtime image, build/push an xpkg, and install a `pkg.crossplane.io/v1` `Function`.
- The testing command used the outdated `crossplane beta render` form and referenced an uncreated `observed.yaml`. Updated it to `crossplane composition render ... functions.yaml --include-function-results`.
- The monitoring snippet imported `promhttp` without using it and referenced the old protobuf package. Removed the unused import and updated the request/response types.
- The Dockerfile used the unsupported Go 1.21 builder image. Updated it to Go 1.26, the current supported major release as of the review date.

## Review Notes
- The example custom input API groups such as `validator.fn.crossplane.io/v1beta1` and `calculator.fn.crossplane.io/v1beta1` are illustrative and would need matching function input schemas in a real package.
- Provider resource API groups and fields can vary by AWS provider family and version. The examples remain illustrative and should be checked against the exact provider version used in a production control plane.

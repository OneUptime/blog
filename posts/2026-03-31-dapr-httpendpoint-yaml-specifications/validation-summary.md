# Validation Summary: How to Write Dapr HTTPEndpoint YAML Specifications

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr HTTPEndpoint resource (v1alpha1)
- Dapr Resiliency policies
- Dapr Service Invocation API
- Kubernetes (secrets, kubectl)
- YAML configuration
- Node.js / JavaScript (axios)

## Sources Consulted
- Dapr HTTPEndpoint schema spec: https://docs.dapr.io/reference/resource-specs/httpendpoints-schema/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Resiliency overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency schema spec: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Resiliency retry policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Resiliency targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr non-Dapr endpoint invocation guide: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-non-dapr-endpoints/
- Dapr component scopes: https://docs.dapr.io/operations/components/component-scopes/
- Dapr source code (HTTPEndpoint types): https://github.com/dapr/dapr/blob/master/pkg/apis/httpEndpoint/v1alpha1/types.go
- Dapr source code (Resiliency types): https://github.com/dapr/dapr/blob/master/pkg/apis/resiliency/v1alpha1/types.go
- Dapr source code (NameValuePair): https://github.com/dapr/dapr/blob/master/pkg/apis/common/namevalue.go

## Issues Found
- **Resiliency target type `httpEndpoints` does not exist.** In the "Combining with Resiliency" section, the YAML used `targets.httpEndpoints.stripe-api` as the resiliency target. The Dapr Resiliency spec's `Targets` struct only supports three target types: `apps`, `actors`, and `components`. There is no `httpEndpoints` target type (verified against the Go source code). Since HTTPEndpoints are invoked through the service invocation API, the correct target type is `apps`. Changed `httpEndpoints` to `apps`.

## Review Notes
- The `auth.secretStore` field on the HTTPEndpoint resource is not mentioned. When using `secretKeyRef` in headers, Dapr defaults to Kubernetes secrets as the secret store. The blog's approach works correctly on Kubernetes without specifying `auth.secretStore`, but readers deploying outside Kubernetes (e.g., self-hosted mode with a different secret store) would need to add the `auth` block. This is not an error, just an omission that could be mentioned in a future update.
- The exponential retry policy example omits the `duration` field (initial backoff interval). This is acceptable as Dapr uses a sensible default, but specifying it explicitly would make the example more complete.

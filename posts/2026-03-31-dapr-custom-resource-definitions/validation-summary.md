# Validation Summary: How to Use Dapr Custom Resource Definitions (CRDs)

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes Custom Resource Definitions (CRDs)
- Dapr Component CRD (state stores, pub/sub, bindings, secret stores)
- Dapr Configuration CRD (tracing, mTLS, feature flags)
- Dapr Resiliency CRD (retries, timeouts, circuit breakers)
- Dapr Subscription CRD (pub/sub topic subscriptions)
- Dapr HTTPEndpoint CRD (external HTTP service invocation)
- kubectl CLI
- Redis (as example state store)
- Zipkin (as example tracing backend)

## Sources Consulted
- Dapr official documentation — Component spec: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr official documentation — Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr official documentation — Resiliency spec: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr official documentation — Subscription spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr official documentation — HTTPEndpoint spec: https://docs.dapr.io/reference/resource-specs/httpendpoint-schema/
- Dapr official documentation — Service invocation of HTTP endpoints: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-non-dapr-endpoints/
- Dapr official documentation — Preview features (HotReload): https://docs.dapr.io/operations/configuration/preview-features/

## Issues Found
- **Subscription CRD used deprecated v1alpha1 apiVersion**: The Subscription example used `apiVersion: dapr.io/v1alpha1` with the `spec.route` field. The v1alpha1 Subscription spec is deprecated; the current default is `dapr.io/v2alpha1`, which uses `spec.routes.default` instead of `spec.route`. Updated the apiVersion to `dapr.io/v2alpha1` and changed `route: /orders/process` to `routes.default: /orders/process`.

## Review Notes
- All other CRD examples (Component, Configuration, Resiliency, HTTPEndpoint) use correct apiVersions, field names, and structures.
- The CRD list output is simplified to show only CRD names; actual `kubectl get crd` output includes additional columns (CREATED AT, etc.), but this is acceptable for a blog post.
- The Resiliency CRD correctly uses CEL expression syntax for the circuit breaker `trip` field.
- The HTTPEndpoint service invocation URL pattern (`/v1.0/invoke/<name>/method/<path>`) is correct.
- The `dapr.io/config` annotation for referencing a Configuration CRD is correct.
- The HotReload feature name in the Configuration example is a valid Dapr preview feature.

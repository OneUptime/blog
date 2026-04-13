# Validation Summary: How to Choose Between Dapr and Service Mesh Features

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (service invocation, state management, pub/sub, actors, secrets, resiliency policies)
- Istio (VirtualService, DestinationRule, EnvoyFilter, mTLS, traffic splitting)
- Kubernetes
- Envoy (underlying proxy for both Dapr and Istio)

## Sources Consulted
- Dapr Resiliency spec documentation: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency policy configuration: https://docs.dapr.io/operations/resiliency/policies/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Dapr and service mesh integration guidance: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/#using-dapr-with-a-service-mesh
- Istio rate limiting documentation: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/

## Issues Found
No technical issues found.

## Review Notes
- The Istio VirtualService example uses `apiVersion: networking.istio.io/v1alpha3`, which is functional but outdated. Istio has promoted networking APIs to `v1` as of Istio 1.22 (2024). For a 2026 blog post, `networking.istio.io/v1` would be more current. Not changed because `v1alpha3` is still supported and not technically incorrect.
- The Dapr resiliency policy is named `retryForever` but has `maxRetries: 5`, which is a misleading name choice. Not changed because the YAML is structurally valid and policy names are user-defined.
- The feature comparison table accurately captures the current state of feature overlap between Dapr and Istio. The "Limited" characterization for Dapr rate limiting is appropriate since it is available only via middleware components, not as a first-class building block API.

# Validation Summary: How to Use CEL Expressions for Custom CRD Health in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD Kustomizations
- Common Expression Language (CEL)
- Kubernetes Custom Resource Definitions (CRDs)
- cert-manager
- Crossplane
- Istio
- Prometheus Operator
- Sealed Secrets
- Strimzi Kafka Operator
- KEDA
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CEL health check cheatsheet: https://fluxcd.io/flux/cheatsheets/cel-healthchecks/
- Flux v2.5 release announcement: https://fluxcd.io/blog/2025/02/flux-v2.5.0/
- Flux v2.8 release announcement: https://fluxcd.io/blog/2026/02/flux-v2.8.0/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane providers documentation: https://docs.crossplane.io/latest/packages/providers/
- Istio configuration status field reference: https://istio.io/latest/docs/reference/config/config-status/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://preliminary.istio.io/latest/docs/reference/config/networking/destination-rule/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Strimzi Operator documentation: https://strimzi.io/docs/operators/latest/deploying
- KEDA ScaledObject specification and events reference: https://keda.sh/docs/2.15/reference/scaledobject-spec/ and https://keda.sh/docs/2.19/reference/events/

## Issues Found
- The prerequisites said only "Flux CD v2.5+ with CEL health check support." Flux v2.5 introduced CEL health checks, but Flux v2.5 is now end-of-life according to Flux release notes. Updated the text to say v2.5 introduced the feature and to recommend a currently supported Flux release.
- The general explanation implied that `healthCheckExprs` are evaluated on their own. Flux documentation states that health check expressions are evaluated when `.spec.wait` is enabled or `.spec.healthChecks` is specified. Updated the explanation to include this requirement.
- The Istio examples used a `Reconciled` condition for `VirtualService` and `DestinationRule`. Istio's documented configuration status condition is `PassedAnalysis`. Updated the Istio CEL expressions to check `PassedAnalysis` instead.

## Review Notes
The Flux documentation and CEL cheatsheet use the same `filter(...).all(...)` condition pattern shown throughout the post. Teams should still test expressions against real CR status objects, especially for resources whose status fields may be absent during early reconciliation.

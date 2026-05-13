# Validation Summary: How to Configure Gateway API with Cross-Namespace Routes via Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Gateway
- HTTPRoute
- ReferenceGrant
- Flux CD Kustomization
- kubectl
- curl

## Sources Consulted
- Kubernetes Gateway API v1.5 specification: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Kubernetes Gateway API v1.5 release notes for ReferenceGrant v1 promotion: https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The post incorrectly stated that `ReferenceGrant` grants `HTTPRoute` resources permission to attach to a shared `Gateway` in another namespace. Updated the explanation, diagram, and best-practice guidance to clarify that Route-to-Gateway attachment is governed by the Gateway listener's `allowedRoutes` policy, while `ReferenceGrant` is used for other cross-namespace references such as backend `Service` references.
- The example created `ReferenceGrant` resources for `HTTPRoute` to `Gateway` references, which are not used for Gateway attachment. Removed those grants and kept a `ReferenceGrant` in the backend namespace for a frontend `HTTPRoute` referencing the backend `Service`.
- The frontend `HTTPRoute` did not actually use the cross-namespace backend service grant shown in the post. Added a `/api` rule with a `backendRefs.namespace: backend` reference so the `ReferenceGrant` example is exercised.
- Updated the `ReferenceGrant` API version from `gateway.networking.k8s.io/v1beta1` to `gateway.networking.k8s.io/v1`, matching Gateway API v1.5 where `ReferenceGrant` was promoted to stable.
- Replaced the Flux verification command with the officially documented `flux get kustomizations`.
- Updated the conclusion to mention both `allowedRoutes` and `ReferenceGrant` as the relevant cross-namespace access controls.

## Review Notes
The local environment did not include `kubectl` or `flux`, so CLI syntax was verified against official documentation rather than local `--help` output. The snippets assume the referenced namespaces, GatewayClass, TLS Secret, Gateway controller, and backend Services exist.

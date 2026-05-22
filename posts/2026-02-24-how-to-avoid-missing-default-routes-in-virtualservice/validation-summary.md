# Validation Summary: How to Avoid Missing Default Routes in VirtualService

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Kubernetes
- kubectl
- jq
- istioctl analyze
- yq
- OPA Gatekeeper
- Rego

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio configuration analysis messages: https://istio.io/latest/docs/reference/config/analysis/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper how-to documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/

## Issues Found
- The canary deployment section described "percentage-based routing" while the example used header-based routing. Updated the wording and comment to match the actual configuration.
- The A/B testing example was labeled "BAD" even though it already included a default control route. Updated the comment so the example is correctly presented as a valid pattern.
- The URI-based routing "useful error" example used fault injection with `percentage.value: 0`, which would not abort requests. Replaced it with an Istio `directResponse` example that actually returns HTTP 404.
- The Gatekeeper section only provided a `ConstraintTemplate`, which defines a policy type but does not enforce it by itself. Added a structural `openAPIV3Schema` and a matching `IstioMissingDefaultRoute` constraint so the snippet can enforce the policy for VirtualServices.

## Review Notes
- The main VirtualService claims are consistent with Istio documentation: HTTP routes are ordered, the first matching route is used, matchless HTTP routes act as catch-all routes, and weights distribute traffic within the selected route.
- `istioctl analyze --all-namespaces` is valid and useful for related Istio configuration problems, but the custom default-route check remains necessary for this specific policy.

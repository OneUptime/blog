# Validation Summary: How to Set Up Header-Based Canary Routing in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio header matching and HeaderOperations
- Kubernetes Deployments
- kubectl
- Prometheus/PromQL
- Python/Flask HTTP header forwarding

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/

## Issues Found
- The introduction described percentage-based routing as random users hitting the canary. Istio route weights distribute a proportion of requests, so this was changed to "a weighted share of requests."
- The gateway cookie match used `.*canary=true.*`, which could match unrelated cookie values containing that substring. The regex was tightened to match the `canary=true` cookie name/value with cookie boundaries.
- The `HeaderOperations` section implied header injection could be an alternative to application-level propagation. The wording was corrected to state that Istio can inject routing metadata before the selected service receives a request, but that this does not replace forwarding headers on downstream application calls.

## Review Notes
The Istio examples use current `networking.istio.io/v1` APIs, valid `exact`, `prefix`, and RE2-style `regex` header matching, valid subset references through `DestinationRule`, and valid route weights. The later examples assume the `DestinationRule` subsets from the first example still exist. Short service names such as `my-app` are valid when the `VirtualService` and service are in the same namespace, but fully qualified service names are preferable in production to avoid namespace ambiguity.

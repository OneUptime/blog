# Validation Summary: How to Route Traffic by User-Agent Header in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio traffic routing subsets
- Envoy/RE2 regular expression matching
- Kubernetes kubectl
- istioctl diagnostics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Envoy RegexMatcher reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/type/matcher/v3/regex.proto

## Issues Found
- The iOS/Android routing example used `ios-backend` and `android-backend` subsets without noting that they must be defined in a corresponding DestinationRule. Added a sentence before the example to make that requirement explicit, matching Istio's rule that route destination subsets must be declared in a DestinationRule.
- The `istioctl proxy-config routes` example used `deploy/my-app-standard`. Istio's command reference documents deployment targets as `deployment/<deployment-name>`, so the example was changed to `deployment/my-app-standard`.

## Review Notes
The VirtualService examples use the current `networking.istio.io/v1` API and valid `headers`, `uri`, `regex`, `prefix`, `route`, `destination`, and `subset` fields. The explanation of match ordering and AND semantics inside a single match block matches the Istio reference. The notes about lowercase header keys and RE2 regex matching are technically correct.

# Validation Summary: How to Route Traffic Based on URI Path in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Kubernetes
- Istio Gateway
- Istio VirtualService
- Istio DestinationRule subsets
- Envoy routing and access logs
- istioctl
- kubectl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The prerequisites said a DestinationRule was required for each target service. DestinationRules are required for subset routing, but not for every plain service destination, so the wording was changed to require a DestinationRule when routing to subsets such as `v1`, `v2`, or `v3`.
- The regex example was not anchored even though the surrounding explanation described a complete user-detail path match. The regex was changed from `/api/v[0-9]+/users/[0-9]+` to `^/api/v[0-9]+/users/[0-9]+$` to match the stated behavior precisely with Istio's RE2-style regex matching.
- The debugging section comment said the `kubectl logs` command enabled access logging. That command reads logs; access logging is enabled through Istio Telemetry API or mesh config. The comment was changed to say it checks access logs if they are enabled.

## Review Notes
The remaining VirtualService examples use current `networking.istio.io/v1` APIs and valid fields for URI `exact`, `prefix`, `regex`, `rewrite.uri`, header and method matches, Gateway binding, route destinations, ports, and subsets. The post correctly notes that prefix rewrites replace the matched prefix, rules are evaluated in order, URI matching is case-sensitive by default, and regex matching uses Istio's supported regex path matching.

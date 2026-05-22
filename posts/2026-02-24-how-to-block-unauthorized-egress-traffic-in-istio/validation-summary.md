# Validation Summary: How to Block Unauthorized Egress Traffic in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar mode
- Istio outbound traffic policy
- Istio ServiceEntry
- Istio AuthorizationPolicy
- Istio Sidecar resources
- Kubernetes kubectl logs
- Prometheus alerting and PromQL

## Sources Consulted
- Istio Accessing External Services: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Understanding Traffic Routing: https://istio.io/latest/docs/ops/configuration/traffic-management/traffic-routing/
- Istio Sidecar Injection Problems / proxy startup guidance: https://istio.io/latest/docs/ops/common-problems/injection/

## Issues Found
- The dependency-discovery log example queried the ingress gateway logs, which would not generally show outbound calls made by application workloads. Changed it to query the source workload sidecar proxy logs.
- The post described ServiceEntries as applying globally. This is imprecise because ServiceEntries are configuration entries, not workload-specific policy, and their visibility can be affected by Istio scoping. Reworded the claim to avoid implying they are always global.
- The egress gateway ALLOW example only matched source identity and port, so it did not actually restrict the allowed external destination. Added a `connection.sni` condition for `api.github.com`, which is the supported way to match TLS SNI in AuthorizationPolicy.
- The DENY example used `operation.hosts` to block a TLS destination. Istio documents `operation.hosts` as HTTP-only, so the example would not be correct for the TLS ServiceEntries used in the post. Replaced it with a `connection.sni` condition and port match.
- The Sidecar resource example used `"./backend-api.default.svc.cluster.local"` from the `frontend` namespace, but `./` means the same namespace as the Sidecar resource. Changed it to `"default/backend-api.default.svc.cluster.local"` and updated the explanatory sentence.
- The init-container pitfall incorrectly implied `holdApplicationUntilProxyStarts` is specifically a fix for init containers. Reworded it to describe the application-container startup race that this setting is documented to mitigate.

## Review Notes
- `kubectl` and `istioctl` were not installed in the local environment, so command behavior was verified against official documentation and the YAML snippets were parsed locally with PyYAML.
- The Istio docs note that `REGISTRY_ONLY` is useful for explicitly failing unknown outbound traffic, but it is not a complete outbound firewall by itself. The post correctly points readers toward egress gateways for stronger control.

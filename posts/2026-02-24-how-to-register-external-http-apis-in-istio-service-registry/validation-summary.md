# Validation Summary: How to Register External HTTP APIs in Istio Service Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ServiceEntry
- Istio VirtualService
- Istio DestinationRule
- Istio outbound traffic policy
- Istio telemetry metrics
- Kubernetes kubectl
- istioctl

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Sidecar reference and outbound traffic policy notes: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio egress control task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The post claimed AuthorizationPolicy could restrict which workloads were allowed to call a specific external API and included an AuthorizationPolicy using `selector` on `app: my-app`. Istio AuthorizationPolicy selectors apply the policy to the selected target workload/proxy, and Istio documents `REGISTRY_ONLY` and egress gateways as the relevant mechanisms for external egress control. I replaced the AuthorizationPolicy section with a REGISTRY_ONLY outbound traffic policy example and noted that strict workload-specific egress security should be enforced through an Istio egress gateway.
- The benefits list claimed "Security policies controlling which workloads can call which APIs." I changed this to "Egress controls that make unregistered external calls fail in REGISTRY_ONLY mode" to match Istio's documented behavior.

## Review Notes
The ServiceEntry, VirtualService, DestinationRule, Prometheus metric names, and istioctl proxy-config examples match current Istio documentation. The article focuses on plain HTTP external APIs; HTTPS egress has different protocol/SNI and TLS origination considerations that could be covered separately in a future post.

# Validation Summary: How to Configure Security for External Services in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- ServiceEntry
- DestinationRule
- VirtualService
- AuthorizationPolicy
- Telemetry API
- Egress gateways
- TLS and mutual TLS origination

## Sources Consulted
- Istio documentation: Accessing External Services, https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio documentation: Egress TLS Origination, https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio documentation: Egress Gateways, https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio API reference: ServiceEntry, https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio API reference: DestinationRule, https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio API reference: VirtualService, https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio API reference: AuthorizationPolicy, https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio API reference: Telemetry, https://istio.io/latest/docs/reference/config/telemetry/
- Istio command reference: pilot-agent, https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio API reference: Resource Annotations, https://istio.io/latest/docs/reference/config/annotations/

## Issues Found
- The TLS origination example routed HTTP traffic to destination port 443 with a VirtualService, while the DestinationRule configured TLS origination under `portLevelSettings` for port 80. That means the TLS policy would not apply to the routed destination port as described. Updated the ServiceEntry to use `targetPort: 443` on port 80, changed the HTTPS port protocol to `HTTPS`, removed the unnecessary VirtualService, and adjusted the explanation to match Istio's documented TLS origination pattern.

## Review Notes
- The direct wildcard ServiceEntry examples using `resolution: NONE` remain valid; current Istio documentation also notes newer `DYNAMIC_DNS` support for wildcard HTTPS destinations in recent Istio versions.
- The sidecar volume annotations used for mounting certificate files are still documented but are alpha annotations. For new mutual TLS origination configurations, Istio's documented examples commonly use `credentialName` with a workload-scoped DestinationRule and Kubernetes secrets.

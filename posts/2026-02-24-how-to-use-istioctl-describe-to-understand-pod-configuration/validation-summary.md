# Validation Summary: How to Use istioctl describe to Understand Pod Configuration

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Istio
- istioctl
- Kubernetes Services and pods
- Istio VirtualService
- Istio DestinationRule
- Istio PeerAuthentication and mTLS
- Envoy proxy configuration

## Sources Consulted
- Istio: Understand your Mesh with Istioctl Describe: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio CLI reference for `istioctl experimental describe pod` and `service`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration and Auto mTLS documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/

## Issues Found
- The post used `istioctl describe` as though it were a top-level command. The current Istio CLI reference documents this under `istioctl experimental describe`, with `istioctl x describe` as the short alias. Updated command examples and surrounding text to use `istioctl x describe`, and added a short note explaining the alias.
- The introduction and service section overstated the command as showing every Istio configuration affecting a pod or service. The official reference describes it as analyzing pods, Services, DestinationRules, and VirtualServices. Narrowed the wording accordingly.
- The 503 troubleshooting scenario incorrectly said that a DestinationRule with subsets but no VirtualService usually causes Envoy not to know which subset to pick. A DestinationRule defining subsets does not by itself require subset routing. Reworked the scenario to cover the documented failure cases: VirtualService routes to a subset with no matching DestinationRule, or to a subset whose labels do not match pods.
- The mTLS scenario implied that Service A's PERMISSIVE mode determines whether it sends mTLS to Service B. PeerAuthentication controls inbound acceptance, while DestinationRules or auto mTLS control outbound TLS origination. Updated the explanation to reflect that distinction.

## Review Notes
The `istioctl experimental describe` command is still marked by Istio's CLI reference as under active development and not ready for production use. The post now uses the documented `x` alias, but future reviews should re-check whether Istio promotes or changes this command.

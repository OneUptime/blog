# Validation Summary: How to Configure Traffic Routing Based on Source IP in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio AuthorizationPolicy
- Istio Telemetry API
- Istio gateway topology and Envoy `X-Forwarded-For` handling
- Kubernetes LoadBalancer Services and `externalTrafficPolicy`
- Stripe webhook IP allowlisting

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio ingress access control task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio gateway network topology documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Kubernetes source IP preservation tutorial: https://kubernetes.io/docs/tutorials/services/source-ip/
- Stripe domains and IP addresses documentation: https://docs.stripe.com/ips

## Issues Found
- The VirtualService examples used `networking.istio.io/v1beta1`. Updated them to the current stable `networking.istio.io/v1` API version used in current Istio documentation.
- The Telemetry example used `telemetry.istio.io/v1alpha1`. Updated it to `telemetry.istio.io/v1`, which is the current API version in Istio's Telemetry and access logging documentation.
- The AuthorizationPolicy evaluation order omitted CUSTOM policies. Added the CUSTOM step before DENY to match Istio's documented policy evaluation order.
- The load balancer source IP explanation grouped PROXY protocol and `externalTrafficPolicy: Local` too loosely. Clarified that `X-Forwarded-For`/PROXY protocol require gateway topology configuration, while `externalTrafficPolicy: Local` applies when the load balancer preserves packet source addresses.
- The VirtualService header-routing section did not warn that `X-Forwarded-For` can be client supplied unless sanitized by trusted infrastructure. Added a short caveat so the routing example is not presented as trustworthy without that condition.
- The Stripe webhook example listed only four webhook source IPs while describing them as Stripe's documented webhook IPs. Added the remaining currently documented Stripe webhook IP addresses from Stripe's official IP documentation.

## Review Notes
The Istio `gatewayTopology` documentation marks gateway network topology features as alpha, but the fields used in the post are still present in current official documentation. The post uses Istio APIs rather than Kubernetes Gateway API examples; that is still valid, though Istio documentation increasingly presents both options.

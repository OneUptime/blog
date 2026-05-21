# Validation Summary: How to Set Up Service Mesh for E-Commerce Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Kubernetes
- Istio Gateway, VirtualService, DestinationRule, EnvoyFilter
- Istio PeerAuthentication and AuthorizationPolicy
- Kubernetes HorizontalPodAutoscaler
- Prometheus metrics and alerting expressions

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio rate limit task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Envoy HTTP retry policy documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html#x-envoy-retry-on
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- Several Istio examples used older `v1beta1` API versions for resources that now have stable `v1` APIs in current Istio documentation. Updated Gateway, VirtualService, DestinationRule, PeerAuthentication, and AuthorizationPolicy snippets to use `networking.istio.io/v1` or `security.istio.io/v1` as appropriate.
- The payment retry explanation said connection failures mean the request definitely did not reach the payment provider. Envoy's `reset` retry condition does not guarantee that application-side effects did not happen. Reworded the guidance to keep retries limited to connection-level failures and require idempotent payment operations.
- The canary deployment example referenced `stable` and `canary` subsets without defining them. Istio requires VirtualService destination subsets to be declared in a corresponding DestinationRule. Added `stable` and `canary` subsets to the existing `product-catalog` DestinationRule.

## Review Notes
- The EnvoyFilter rate limit example follows Istio's documented local rate limit pattern, but EnvoyFilter exposes Envoy internals and should be tested carefully during Istio upgrades.
- The Prometheus queries use standard Istio telemetry metric names, but production dashboards may need additional labels such as canonical service, revision, reporter, or response class depending on the telemetry configuration.

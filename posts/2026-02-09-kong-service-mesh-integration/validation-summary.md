# Validation Summary: How to Configure Kong Ingress Controller with Service Mesh Integration

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes Ingress and Services
- Kong Ingress Controller and Kong Gateway Helm charts
- KongPlugin and KongClusterPlugin resources
- Istio sidecar mode, PeerAuthentication, VirtualService, DestinationRule, AuthorizationPolicy, and Telemetry
- Linkerd proxy injection and SMI TrafficSplit
- Prometheus and Zipkin observability plugins

## Sources Consulted
- Kong Ingress Controller installation docs: https://developer.konghq.com/kubernetes-ingress-controller/install/
- Kong Helm charts repository and chart values: https://github.com/Kong/charts
- Kong Ingress Controller annotation reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- Kong Ingress Controller custom resource reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong upstream TLS verification guide: https://developer.konghq.com/kubernetes-ingress-controller/verify-upstream-tls/
- Kong mTLS guide: https://developer.konghq.com/kubernetes-ingress-controller/mtls/
- Kong Zipkin plugin docs: https://developer.konghq.com/plugins/zipkin/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Linkerd proxy injection docs: https://linkerd.io/2-edge/features/proxy-injection/
- Linkerd proxy configuration and ingress mode docs: https://linkerd.io/2.16/reference/proxy-configuration/
- Linkerd TrafficSplit docs: https://linkerd.io/2/features/traffic-split/
- Linkerd SMI extension docs: https://linkerd.io/2/tasks/linkerd-smi/

## Issues Found
- Kong Helm values used outdated or incorrect paths such as `proxy.type`, `proxy.annotations`, and `ingressController.env.CONTROLLER_ISTIO_SERVICE_MESH`. Updated examples to use current `kong/ingress` chart paths under `gateway` and `controller`.
- The Istio example disabled Kong sidecar injection while also enabling strict mTLS for backend workloads. An unmeshed Kong Gateway cannot originate Istio mTLS to a strict mesh workload, so the example now injects the Kong Gateway pod for outbound mesh traffic and keeps the controller pod unmeshed.
- The post claimed end-to-end mTLS from external clients through backend services. Reworded this to TLS at ingress and mTLS between meshed workloads, which matches the shown configurations.
- The backend Service examples did not use Kong's service-upstream annotation, so Kong could bypass mesh/service-level routing by sending traffic directly to pod endpoints. Added `ingress.kubernetes.io/service-upstream: "true"` where mesh routing is expected.
- The Istio `VirtualService` referenced `v1` and `v2` subsets without defining them. Added a matching `DestinationRule`.
- The Linkerd TrafficSplit example omitted the Linkerd SMI extension requirement and did not mention that TrafficSplit is deprecated. Added the extension install command and a deprecation note pointing readers toward HTTPRoute-based routing for new deployments.
- The Istio Telemetry snippet used an invalid `dimensions` field under `metrics.providers`. Updated it to use `overrides` and `tagOverrides`.
- The Kong Prometheus plugin was defined as an unattached namespaced `KongPlugin`. Changed it to a global `KongClusterPlugin` with the required ingress class annotation and global label.
- The Zipkin `KongPlugin` was in the `kong` namespace while the annotated Ingress was in `default`. Moved the plugin to `default` so the annotation resolves correctly.
- The mTLS-from-Kong example used the inbound `mtls-auth` plugin for upstream mTLS. Replaced it with Kong Service annotations for upstream protocol, client certificate, TLS verification, and CA certificate resources.
- The Istio `AuthorizationPolicy` used the older `v1beta1` API and did not declare its ALLOW action explicitly. Updated it to `security.istio.io/v1` and added `action: ALLOW`.
- Testing commands referred to an unspecified Istio proxy pod and assumed Zipkin/Grafana add-ons are installed. Updated the mTLS test to use Istio's sample curl workload and marked Zipkin/Grafana checks as add-on dependent.

## Review Notes
The examples remain version-sensitive: Kong upstream TLS verification annotations require Kong Ingress Controller 3.4 or newer, and Linkerd SMI TrafficSplit is deprecated and should be avoided for new deployments.

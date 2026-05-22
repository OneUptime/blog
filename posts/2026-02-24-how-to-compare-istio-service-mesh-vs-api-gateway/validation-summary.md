# Validation Summary: How to Compare Istio Service Mesh vs API Gateway

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Istio ingress gateway
- Istio VirtualService
- Istio AuthorizationPolicy
- Envoy rate limiting
- Kong Gateway
- Kong Ingress Controller
- Kubernetes Ingress
- API gateways
- Service mesh architecture

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio gateway installation documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Kong Ingress Controller annotation reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- Kong Ingress Controller custom resources reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong KongIngress migration/deprecation guide: https://developer.konghq.com/kubernetes-ingress-controller/migrate/kongingress/
- Kong Rate Limiting plugin documentation: https://developer.konghq.com/plugins/rate-limiting/
- Kong Key Auth plugin documentation: https://developer.konghq.com/plugins/key-auth/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The first Kong example used a deprecated `KongIngress` resource and placed plugin configuration under an invalid inline `plugin` field. Replaced it with current `KongPlugin` resources and attached them to a Kubernetes `Ingress` with `konghq.com/plugins`, matching Kong Ingress Controller documentation.
- The Istio `VirtualService` examples used `networking.istio.io/v1beta1`. Updated them to `networking.istio.io/v1`, which is the current stable Istio networking API version.
- The overlap section described service-mesh rate limiting with a circuit-breaking example. Reworded it so rate limiting uses Envoy local rate limiting, and circuit breaking is described separately as connection-pool/outlier-detection behavior.
- The combined Kong/Istio example referenced plugins without defining them. Added the corresponding `KongPlugin` resources so the `konghq.com/plugins` annotation points to concrete plugin objects.
- The combined example did not account for the common namespace and service-account identity of an Istio ingress gateway. Added the `istio-system` namespace where the Kubernetes `Ingress` targets the `istio-ingressgateway` Service, qualified the Istio gateway reference, and corrected the ingress gateway source principal in the `AuthorizationPolicy`.

## Review Notes
- The article is a conceptual comparison with illustrative configuration, not a complete deployment recipe. A production setup would still need concrete Service, Gateway, DestinationRule, KongConsumer, credential, TLS certificate, and namespace manifests.
- Istio supports rate limiting through Envoy configuration, commonly via `EnvoyFilter`; the Istio documentation cautions that EnvoyFilter exposes implementation details that require care during upgrades.

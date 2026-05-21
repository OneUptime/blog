# Validation Summary: How to Understand What Istio Service Mesh Actually Does

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- Kubernetes Services
- Istio VirtualService
- Istio DestinationRule
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- Prometheus metrics
- Distributed tracing

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio mutual TLS migration guide: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio distributed tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio application requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio getting started guide: https://istio.io/latest/docs/setup/getting-started/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes virtual IPs and service proxies reference: https://kubernetes.io/docs/reference/networking/virtual-ips/

## Issues Found
- Updated Istio custom resource examples from `networking.istio.io/v1beta1` and `security.istio.io/v1beta1` to the current documented `v1` API versions for VirtualService, DestinationRule, and AuthorizationPolicy.
- Clarified that Kubernetes Services load-balance across matching ready endpoints but do not provide Istio-style version-weighted routing. This avoids implying that every Kubernetes proxy mode is strictly round-robin.
- Corrected the mTLS explanation. Istio sidecars automatically use mTLS for mesh workload calls when possible, but default PeerAuthentication behavior is permissive, so plaintext is still accepted unless STRICT mode is configured.
- Added the tracing caveat that applications must propagate trace context headers for separate proxy-generated spans to be joined into a complete distributed trace.
- Corrected the sidecar traffic flow. The application sends traffic to the target service address as usual; iptables redirects outbound traffic to Envoy. It does not normally send outbound service calls directly to localhost.
- Narrowed the database statement. Istio can handle TCP traffic and has protocol detection caveats for common database ports, but database-specific behavior such as pooling and query optimization remains outside Istio.
- Reworded the demo profile comment. The demo profile is intended for trying Istio samples and showcasing functionality; it is not accurately described as including all features.

## Review Notes
The Prometheus metric names and query shapes are consistent with Istio standard metrics, assuming the Prometheus provider exposes histogram buckets for `istio_request_duration_milliseconds`. The examples use short service names for readability, but Istio documentation recommends fully qualified service names to avoid namespace ambiguity in production configurations.

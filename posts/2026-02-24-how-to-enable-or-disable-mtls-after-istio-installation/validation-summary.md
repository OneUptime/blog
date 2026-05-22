# Validation Summary: How to Enable or Disable mTLS After Istio Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Mutual TLS (mTLS)
- Kubernetes
- Envoy sidecars
- PeerAuthentication
- DestinationRule
- istioctl
- Prometheus metrics scraping

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Mutual TLS Migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Configuring Gateway Network Topology: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/

## Issues Found
- Clarified default behavior after installation. PeerAuthentication defaults to PERMISSIVE, but Istio Auto mTLS still automatically sends mTLS between workloads with sidecars and plaintext to workloads without sidecars.
- Corrected the `DISABLE` description so it does not imply that all traffic everywhere is plaintext; it disables Istio mTLS for the selected workload or port, while application TLS can still be used.
- Clarified that mesh-wide PeerAuthentication belongs in Istio's root namespace, which is commonly but not necessarily `istio-system`.
- Corrected the sidecar prerequisite wording. STRICT mTLS blocks callers without sidecars when they call workloads requiring STRICT mTLS.
- Changed "specific services" wording to "specific workloads" where the configuration is a workload selector.
- Corrected the rationale for disabling mTLS with PeerAuthentication. PeerAuthentication controls inbound/server-side behavior, not outbound calls to external services.
- Added the Istio requirement that `portLevelMtls` ports are workload/container ports, not Kubernetes Service ports.
- Removed the claim that `ISTIO_MUTUAL` is the DestinationRule default. If no TLS settings are configured, Auto mTLS decides whether to use Istio mutual TLS.
- Replaced the obsolete `istioctl authn tls-check` example with current `istioctl proxy-config` listener and cluster checks.
- Corrected the X-Forwarded-Client-Cert verification example. Istio injects this into the upstream request, so it must be observed through a service that echoes request headers, such as httpbin.
- Replaced the ingress PeerAuthentication example with an Istio Gateway example, because regular external ingress should be configured through a gateway rather than by making the ingress gateway workload PERMISSIVE.

## Review Notes
The remaining examples use current Istio `security.istio.io/v1` and `networking.istio.io/v1` APIs. The Prometheus section is accurate at a high level, but a future expansion could show the full Prometheus-side configuration for scraping with Istio certificates.

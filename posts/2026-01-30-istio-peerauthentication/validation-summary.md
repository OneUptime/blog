# Validation Summary: How to Create Istio PeerAuthentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio PeerAuthentication
- Istio DestinationRule
- Kubernetes
- Envoy sidecars
- Mutual TLS (mTLS)
- Prometheus and Kiali observability

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio security concepts and authentication policy behavior: https://istio.io/latest/docs/concepts/security/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio mutual TLS migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Prometheus metrics guidance: https://istio.io/latest/docs/ops/integrations/prometheus/

## Issues Found
- Updated all Istio API examples from `security.istio.io/v1beta1` and `networking.istio.io/v1beta1` to the current documented `security.istio.io/v1` and `networking.istio.io/v1` API versions.
- Clarified `portLevelMtls` semantics: Istio documents these as workload container ports, not Kubernetes Service ports, and they only apply when the port is bound by a Service.
- Replaced examples that used Istio's `15020` sidecar/merged-metrics port as a PeerAuthentication application-port exception with an application metrics port (`9090`) and a dedicated health-check port (`8081`), matching Istio's port-level mTLS rules.
- Corrected the DestinationRule section to avoid implying explicit DestinationRules are always required for complete mesh mTLS. Istio automatically configures sidecars to use mTLS for mesh-to-mesh calls, while DestinationRule is used to explicitly configure client-side TLS behavior.
- Replaced the outdated `istioctl authn tls-check` command with the current `istioctl x describe pod` command from the Istio command reference.
- Updated the security checklist item about DestinationRules to match the corrected auto-mTLS guidance.

## Review Notes
The post is technically valid after the fixes. The examples assume sidecar mode; Istio ambient mode has different behavior, including no support for `DISABLE` mTLS mode in PeerAuthentication.

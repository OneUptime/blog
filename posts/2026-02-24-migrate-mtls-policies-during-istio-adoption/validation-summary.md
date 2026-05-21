# Validation Summary: How to Migrate mTLS Policies During Istio Adoption

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Mutual TLS (mTLS)
- Kubernetes
- Envoy sidecars
- PeerAuthentication
- AuthorizationPolicy
- Kiali
- Prometheus

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Mutual TLS Migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Security concepts: https://istio.io/latest/docs/concepts/security/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Kubernetes sidecar containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes adopting sidecar containers tutorial: https://kubernetes.io/docs/tutorials/configuration/pod-sidecar-containers/

## Issues Found
- Clarified that automatic mTLS is used when a sidecar talks to another workload with a sidecar. Istio's auto mTLS sends plaintext to workloads without sidecars.
- Clarified that mesh-wide PeerAuthentication must be created in the Istio root namespace, which is commonly but not always `istio-system`.
- Changed an absolute 503 diagnosis to a likely cause. `upstream_reset_before_response_started` can indicate a non-meshed client calling a strict-mTLS destination, but it is not exclusive to that scenario.
- Clarified that `portLevelMtls` keys refer to workload container ports, not Kubernetes Service ports, and that `PERMISSIVE` accepts both plaintext and mTLS on the exception port.
- Updated the Job sidecar note to distinguish legacy sidecars from Kubernetes native sidecars, which can allow Jobs to complete after main containers finish on supported versions.

## Review Notes
The examples use current `security.istio.io/v1` APIs and valid `istioctl proxy-config` commands. The post assumes sidecar mode rather than ambient mode; in ambient mode, `DISABLE` PeerAuthentication is not supported, so a future update could call out the sidecar-mode scope explicitly.

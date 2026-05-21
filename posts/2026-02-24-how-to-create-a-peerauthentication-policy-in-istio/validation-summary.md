# Validation Summary: How to Create a PeerAuthentication Policy in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- PeerAuthentication
- Mutual TLS (mTLS)
- Kubernetes
- Envoy sidecars
- istioctl
- kubectl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio mutual TLS migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl describe diagnostics: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/

## Issues Found
- The post used `istioctl authn tls-check`, which is not present in the current official `istioctl` command reference. I replaced it with `istioctl proxy-config clusters`, which is a current documented way to inspect Envoy cluster configuration for a service from a source pod.
- The post described `portLevelMtls` without the important Istio constraint that it only applies when a workload selector is specified and that the port is the workload/container port rather than the Kubernetes Service port. I added that clarification to prevent incorrect policies.

## Review Notes
- The examples use `security.istio.io/v1`, which is current for Istio security APIs.
- The post is written for sidecar mode. In ambient mode, PeerAuthentication behavior differs, and `DISABLE` mode is not supported.

# Validation Summary: How to Get Started with Istio Ambient Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- Kubernetes
- istioctl
- ztunnel
- Istio CNI
- Waypoint proxies
- Kubernetes Gateway API
- Istio AuthorizationPolicy
- mTLS / HBONE

## Sources Consulted
- Istio ambient getting started: https://istio.io/latest/docs/ambient/getting-started/
- Istio ambient install with istioctl: https://istio.io/latest/docs/ambient/install/istioctl/
- Istio add workloads to the ambient mesh: https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio verify mutual TLS is enabled: https://istio.io/latest/docs/ambient/usage/verify-mtls-enabled/
- Istio configure waypoint proxies: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio enforce authorization policies in ambient mode: https://istio.io/latest/docs/ambient/getting-started/enforce-auth-policies/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio 1.24 release announcement: https://istio.io/latest/news/releases/1.24.x/announcing-1.24/
- Istio ambient GA announcement: https://istio.io/latest/blog/2024/ambient-reaches-ga/

## Issues Found
- The prerequisites listed Kubernetes 1.27 or later, but Istio 1.24.0 was officially supported on Kubernetes 1.28 through 1.31. Updated the prerequisite to Kubernetes 1.28 or later for Istio 1.24.
- The prerequisites said istioctl 1.22 or later for ambient support while the post installs Istio 1.24.0 and discusses ambient GA. Updated this to istioctl 1.24 or later for ambient GA support.
- The waypoint section used `istioctl waypoint apply`, which requires Kubernetes Gateway API CRDs on clusters that do not already include them. Added the official Gateway API CRD installation command before the install flow.
- The mTLS section implied all traffic between pods in the namespace is encrypted and could be read as plaintext rejection. Updated the wording to traffic between ambient mesh workloads, and added the Istio caveat that HBONE configuration alone does not reject plaintext from outside the mesh without `PeerAuthentication` in `STRICT` mode.

## Review Notes
The remaining commands and manifests are consistent with official Istio documentation. The install command uses `-y`, which is the documented shorthand for `--skip-confirmation`. The `AuthorizationPolicy` example uses `targetRefs`, which is the correct waypoint policy attachment mechanism for service-targeted L7 authorization in ambient mode.

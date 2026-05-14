# Validation Summary: How to Deploy Cilium Service Mesh with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Cilium
- Kubernetes
- HelmRelease and HelmRepository CRDs
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- CiliumEnvoyConfig
- Hubble
- SPIRE-based Cilium mutual authentication
- Envoy

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium 1.16.5 Helm chart values and schema from https://helm.cilium.io/cilium-1.16.5.tgz
- Cilium Service Mesh L7 Traffic Management: https://docs.cilium.io/en/stable/network/servicemesh/envoy-traffic-management/
- Cilium Mutual Authentication: https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication/
- Cilium Mutual Authentication Example: https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication-example/
- Cilium DNS and Network Policy documentation: https://docs.cilium.io/en/latest/security/dns.html
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Kubernetes Ingress API documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The Helm values included `serviceMesh.enabled`, which is not a Cilium Helm chart value for Cilium 1.16.x. Removed it and kept the concrete Cilium feature flags used by the guide, such as `envoyConfig.enabled` and mutual authentication settings.
- The Helm values enabled SPIRE but did not explicitly set `authentication.enabled`. Added it for clarity and alignment with Cilium's mutual authentication Helm examples.
- The post described Cilium mutual authentication as service-to-service mTLS. Cilium's documentation describes this feature as beta mutual authentication using SPIFFE/SPIRE, with encryption requirements and limitations. Updated wording and comments to say mutual authentication via SPIRE.
- The L7 policy claimed the `/health` endpoint was allowed from any source, but the rule still had `fromEndpoints` limited to `app: frontend`. Updated the comment to match the policy behavior.
- The L7 policy did not show how mutual authentication is enforced in policy. Added `authentication.mode: "required"` to the ingress rule, matching Cilium's documented policy syntax.
- The `CiliumEnvoyConfig` used weighted clusters but did not define the corresponding Envoy cluster resources and did not list the canary service as a backend service. Added the `backend-api-canary` backend service and Envoy EDS cluster definitions for both weighted clusters.
- The native routing comment implied a general performance setting. Updated it to note that native routing should be used when the underlying network can route PodCIDRs.

## Review Notes
- Kubernetes 1.25 is end-of-life as of this review date. The post's chart target is Cilium 1.16.x, but production users should select a Kubernetes version supported by their chosen Cilium release.
- The Hubble UI Ingress assumes an NGINX ingress controller and a valid TLS secret already exist.
- The native routing and `autoDirectNodeRoutes` example assumes a network topology where direct PodCIDR routing is valid.

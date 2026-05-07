# Validation Summary: How to Set Up a Service Mesh in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes
- Istio
- Helm
- Kiali
- Jaeger
- Envoy

## Sources Consulted
- Rancher Istio integration docs: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/istio
- Rancher guide for enabling Istio in a cluster: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/istio-setup-guide/enable-istio-in-cluster
- Istio Helm installation docs: https://istio.io/latest/docs/setup/install/helm/
- Istio sidecar injection docs: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio ingress gateway docs: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio traffic shifting docs: https://istio.io/latest/docs/tasks/traffic-management/traffic-shifting/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio traffic management troubleshooting: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Kiali access guide: https://kiali.io/docs/installation/installation-guide/accessing-kiali/

## Issues Found
- The post described Rancher-Istio as a generic built-in Rancher feature without the current deprecation caveat. I updated the introduction, prerequisites, and Rancher install step to note that Rancher-Istio was deprecated in Rancher v2.12.0 and corrected the UI path to `Apps & Marketplace > Charts`.
- The prerequisites claimed a hard minimum of 3 nodes and 4 CPU / 8 GB RAM. Rancher’s current docs do not define those as universal minimums, so I replaced them with capacity and access requirements that align with the official guidance.
- The Helm section said “istioctl or Helm” but only showed Helm commands, and it omitted current install flags from the official Helm guide. I changed the wording to Helm-only and added `--set defaultRevision=default` plus `--wait` where appropriate.
- The sample application only deployed `v1`, while the traffic-splitting example routed 10% of traffic to a nonexistent `v2` subset. I added a second deployment with a distinct selector and `version: v2` labels so the canary example is valid.
- The traffic-splitting `VirtualService` would have replaced the gateway route and would not have split ingress traffic as written. I updated it so the gateway-bound `VirtualService` itself performs the weighted routing for `myapp.example.com`.
- After enabling STRICT mTLS, the `DestinationRule` examples could cause TLS conflicts in some installations. I added `trafficPolicy.tls.mode: ISTIO_MUTUAL` to the relevant `DestinationRule` examples and tightened the troubleshooting note for 503 errors.
- The Kiali access step used `http://localhost:20001`. Current Kiali access docs use `https://localhost:20001/`, and Rancher’s newer Kiali installs use token-based auth, so I corrected the URL and noted that sign-in may be required.

## Review Notes
- Rancher-Istio remains documented in Rancher, but Rancher marks it deprecated starting in Rancher v2.12.0 and points users to the SUSE Rancher Application Collection build of Istio for new deployments.
- The post keeps `networking.istio.io/v1beta1` and `security.istio.io/v1beta1` examples for compatibility with Rancher-oriented Istio workflows, although current upstream Istio docs commonly show `v1` resources.

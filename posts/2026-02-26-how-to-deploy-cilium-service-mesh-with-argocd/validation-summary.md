# Validation Summary: How to Deploy Cilium Service Mesh with ArgoCD

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Cilium
- Cilium Service Mesh
- CiliumNetworkPolicy
- CiliumEnvoyConfig
- Hubble
- Argo CD
- Kubernetes
- Gateway API
- Amazon EKS
- eksctl
- Prometheus ServiceMonitor
- Grafana dashboards

## Sources Consulted
- Cilium official documentation: Service Mesh and sidecar-free architecture - https://docs.cilium.io/en/stable/network/servicemesh/
- Cilium official documentation: Mutual Authentication - https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication/
- Cilium official documentation: Ingress Controller - https://docs.cilium.io/en/stable/network/servicemesh/ingress/
- Cilium official documentation: Gateway API - https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium official documentation: Envoy traffic shifting / CiliumEnvoyConfig examples - https://docs.cilium.io/en/stable/network/servicemesh/envoy-traffic-shifting/
- Cilium official Helm values reference - https://docs.cilium.io/en/stable/helm-reference/
- Argo CD official documentation: Diffing customization - https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD official documentation: Resource health customizations - https://argo-cd.readthedocs.io/en/latest/operator-manual/health/
- Gateway API official release install manifests - https://github.com/kubernetes-sigs/gateway-api/releases
- Amazon EKS official Kubernetes version documentation - https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- eksctl official documentation: cluster config and addons - https://eksctl.io/usage/addons/

## Issues Found
- The introduction said Cilium mesh features run at the kernel level. This was too broad because Cilium uses node-local Envoy for L7 service mesh features. Updated the description and Mermaid diagram to distinguish eBPF L3/L4 networking from per-node Envoy L7 handling.
- The EKS example used Kubernetes 1.29 and the older `--vpc-cni-addon=false` flow. Updated it to an eksctl config using `addonsConfig.disableDefaultAddons: true` and Kubernetes 1.35.
- The Cilium Helm chart version was pinned to 1.15.0, which is outdated for a current deployment guide. Updated it to 1.19.4.
- The mutual authentication Helm values used `authentication.mutual.spiffe`, but current Cilium Helm values use `authentication.mutual.spire`. Added `authentication.enabled: true` and corrected the SPIRE key.
- The Helm values enabled Envoy but did not enable CiliumEnvoyConfig support. Added `envoyConfig.enabled: true` because the post later uses `CiliumEnvoyConfig`.
- The mTLS verification command used `hubble observe --type auth`, which is not the documented verification path. Replaced it with Cilium agent log checks and `kubectl get ciliumidentities`.
- The post implied mutual authentication is payload encryption. Added a note that Cilium mutual authentication uses an out-of-band mTLS handshake for identity verification, and that WireGuard or IPsec should be enabled for transparent payload encryption.
- The Ingress example put `ingressClassName` under `metadata.annotations`, which is invalid for `networking.k8s.io/v1`. Moved it to `spec.ingressClassName`.
- The Gateway API example did not mention installing Gateway API CRDs. Added the official standard-install manifest command.
- The CiliumEnvoyConfig canary example was incomplete for Envoy HTTP routing. Added `stat_prefix`, RDS, HTTP router filter, route configuration, and EDS cluster resources based on Cilium's Envoy traffic shifting examples.
- The Argo CD ignore-differences example used jq expressions that treated regex-like annotation names as literal map keys. Replaced it with Argo CD's `managedFieldsManagers` approach for Cilium-owned fields.

## Review Notes
- The post is technically relevant and contains deployable configuration, but real production installs still need environment-specific values such as the EKS API server host, certificate management, load balancer settings, Prometheus Operator availability, and cluster-specific Cilium IPAM choices.
- Cluster Mesh connection steps are shown with the Cilium CLI. Teams enforcing strict GitOps may want to model the generated Cluster Mesh secrets and configuration in their repository workflow.

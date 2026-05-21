# Validation Summary: How to Configure Split-Horizon DNS in Multi-Cluster Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio multi-cluster service discovery
- Istio DNS proxying
- Kubernetes Services and DNS
- CoreDNS forwarding
- Istio ServiceEntry
- kubectl and istioctl

## Sources Consulted
- Istio DNS Proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio Deployment Models documentation, DNS with multiple clusters: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- Istio 1.25 change notes: https://istio.io/latest/news/releases/1.25.x/announcing-1.25/change-notes/

## Issues Found
- The post called the stub Service example "headless", but the manifest does not set `spec.clusterIP: None`. Changed the wording to "selectorless Service", which matches the shown ClusterIP Service without a selector.
- The DNS proxying installation example used `ISTIO_META_DNS_AUTO_ALLOCATE`. Istio 1.25 deprecated that proxy metadata setting in favor of the newer status-based address auto-allocation behavior. Removed it from the install snippet and updated the explanation and recommendation text.
- The stub-service automation copied `.spec.ports` directly from the remote Service. That can include `nodePort`, which is not valid on the default ClusterIP stub Service. Updated the `jq` expression to remove `nodePort` and quoted shell variables in the related kubectl commands.
- The troubleshooting section used an internal-looking `pilot-agent` DNS endpoint. Replaced it with the already documented `istioctl proxy-config bootstrap` metadata check for DNS capture.
- The ServiceEntry example used `networking.istio.io/v1beta1`. Updated it to the current `networking.istio.io/v1` API version used in Istio documentation.

## Review Notes
The post is technically relevant and salvageable. DNS proxying behavior depends on Istio mode and version: DNS capture is enabled by default for ambient mode in current Istio releases, but sidecar mode still requires enabling DNS capture explicitly. The post now reflects the current status-based auto-allocation guidance while preserving the original flow.

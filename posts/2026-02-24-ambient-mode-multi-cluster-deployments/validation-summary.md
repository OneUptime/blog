# Validation Summary: How to Configure Ambient Mode for Multi-Cluster Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- Istio multicluster
- Kubernetes
- Kubernetes Gateway API
- Istio ztunnel
- Istio waypoint proxies
- mTLS and custom CA certificates

## Sources Consulted
- Istio ambient multicluster installation: https://istio.io/latest/docs/ambient/install/multicluster/
- Istio ambient multi-primary, multi-network installation: https://istio.io/latest/docs/ambient/install/multicluster/multi-primary_multi-network/
- Istio ambient multicluster verification: https://istio.io/latest/docs/ambient/install/multicluster/verify/
- Istio ambient multi-network multicluster beta announcement: https://istio.io/latest/blog/2026/ambient-multinetwork-multicluster-beta/
- Istio ambient multicluster alpha announcement: https://istio.io/latest/blog/2025/ambient-multicluster/
- Istio plug in CA certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio troubleshooting multicluster documentation: https://istio.io/latest/docs/ops/diagnostic-tools/multicluster/
- Istio command reference for ztunnel-config and remote-clusters: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The post claimed both primary-remote and multi-primary topologies work with ambient mode. Current Istio ambient multicluster documentation says primary-remote is not currently supported and only multi-primary clusters are supported, so the topology section was corrected.
- The prerequisites allowed flat pod connectivity or gateways. Current ambient multicluster documentation supports multi-network configurations and warns that single-network configurations are untested or may be broken, so the prerequisite was changed to separate Istio networks with reachable east-west gateways.
- The OpenSSL intermediate CA examples did not set CA certificate extensions. The commands were updated to include `basicConstraints` and `keyUsage` extensions so the generated intermediate certificates are valid signing CAs.
- The Istio installation commands did not enable ambient multi-network support. They were replaced with `IstioOperator` manifests that set `AMBIENT_ENABLE_MULTI_NETWORK`, plus `AMBIENT_ENABLE_BAGGAGE` for the documented peer metadata telemetry enhancement.
- The east-west Gateway manifests used `gatewayClassName: istio`, TLS passthrough, and port `15443`. Current ambient east-west Gateway examples use Gateway API `v1`, `gatewayClassName: istio-east-west`, protocol `HBONE`, port `15008`, TLS terminate mode, and `ISTIO_MUTUAL`, so both manifests were corrected.
- The verification service example did not create a local Service in both clusters or mark the Service global. The example was updated to create the Service in both clusters and apply the `istio.io/global: "true"` label before deploying the workload in cluster 2.
- The cross-cluster traffic flow incorrectly routed through the source cluster east-west gateway. Ambient multicluster traffic goes from source ztunnel to the remote cluster east-west gateway, then to the destination ztunnel and pod, so the flow diagram was corrected.
- The waypoint section omitted the current requirement for consistent waypoint names and configuration across clusters. The section was updated to note that matching waypoint deployment names and configuration are assumed.
- The troubleshooting commands used sidecar-style `proxy-config endpoint` against a ztunnel pod and a name grep for remote secrets. These were updated to use `istioctl remote-clusters`, `istioctl ztunnel-config services`, and the documented `istio/multiCluster=true` secret label.

## Review Notes
The corrected post is accurate for Istio 1.30 documentation as of 2026-05-22. Ambient multicluster is still an evolving area with documented limitations around single-network deployments, primary-remote control planes, waypoint consistency, service scoping, and remote load distribution.

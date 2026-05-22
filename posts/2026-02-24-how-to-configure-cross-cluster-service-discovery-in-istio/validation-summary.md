# Validation Summary: How to Configure Cross-Cluster Service Discovery in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio multicluster
- Kubernetes
- Kubernetes Services and EndpointSlices
- Istio remote secrets
- Istio service visibility with `exportTo`
- Istio CLI (`istioctl`)

## Sources Consulted
- Istio multicluster installation overview: https://istio.io/latest/docs/setup/install/multicluster/
- Istio multi-primary installation guide: https://istio.io/latest/docs/setup/install/multicluster/multi-primary/
- Istio primary-remote installation guide: https://istio.io/latest/docs/setup/install/multicluster/primary-remote/
- Istio multicluster verification guide: https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio deployment models: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio configuration scoping: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio `istioctl create-remote-secret` source and reader RBAC manifests: https://github.com/istio/istio

## Issues Found
- Replaced the log-grep verification command with `istioctl remote-clusters --context="${CTX_CLUSTER1}"`, which is the documented Istio verification method for remote cluster sync status.
- Clarified that services with workloads in only one cluster can receive cross-cluster traffic only when the service name resolves in the calling cluster, typically by deploying the Kubernetes Service in each cluster or using equivalent DNS or `ServiceEntry` configuration.
- Clarified service visibility controls: Kubernetes Services use the `networking.istio.io/exportTo` annotation, while Istio resources such as VirtualServices use `spec.exportTo`.
- Added the documented `"~"` `exportTo` option, which hides a service from all namespaces.
- Updated the remote-reader RBAC guidance to align with Istio's current `istio-reader-service-account` and reader ClusterRole pattern, including additional resource types used by modern Istio multicluster discovery.

## Review Notes
The post is technically relevant and the main remote-secret workflow is current. The RBAC example remains a shortened reference rather than a full copy of Istio's generated ClusterRole; future revisions could link to the installed reader ClusterRole or show `kubectl get clusterrole ... -o yaml` to avoid duplicating version-sensitive RBAC.

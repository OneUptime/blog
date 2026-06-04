# Validation Summary: How to Configure Multi-Cluster Services API for Cross-Cluster Service Discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Multi-Cluster Services API
- ServiceExport and ServiceImport CRDs
- Kubernetes Services and DNS
- Submariner and Lighthouse service discovery
- Cilium ClusterMesh
- Istio multi-cluster and mTLS
- Kubernetes admission webhooks
- Prometheus / PromQL

## Sources Consulted
- Kubernetes SIG Multicluster ServiceExport documentation: https://multicluster.sigs.k8s.io/api-types/service-export/
- Kubernetes SIG Multicluster MCS API repository and CRDs: https://github.com/kubernetes-sigs/mcs-api
- MCS API ServiceExport v1beta1 source: https://raw.githubusercontent.com/kubernetes-sigs/mcs-api/master/pkg/apis/v1beta1/serviceexport.go
- MCS API ServiceImport v1beta1 source: https://raw.githubusercontent.com/kubernetes-sigs/mcs-api/master/pkg/apis/v1beta1/serviceimport.go
- Submariner subctl command documentation: https://submariner.io/operations/deployment/subctl/
- Submariner service discovery user guide: https://submariner.io/operations/usage/
- Submariner troubleshooting guide: https://submariner.io/operations/troubleshooting/
- Submariner service discovery architecture: https://submariner.io/getting-started/architecture/service-discovery/
- Cilium MCS API documentation: https://docs.cilium.io/en/latest/network/clustermesh/mcsapi/
- Istio multicluster installation documentation: https://istio.io/latest/docs/setup/install/multicluster/
- Istio command/reference documentation for MCS-related settings: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Topology Aware Routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/

## Issues Found
- The installation section called Submariner the reference implementation and used `subctl join --service-discovery`. Current Submariner documentation lists service discovery as a default component and does not list `--service-discovery` as a `join` flag. Updated the text to describe Submariner Lighthouse and removed the invalid flag.
- The install snippet only joined one cluster. Added a second `subctl join` example for `cluster-2` so cross-cluster discovery can work as described.
- The post described ClusterSetIP as universally accessible and automatically routed. Submariner documents ClusterSet virtual IPs as opt-in and requiring external routing, so the ClusterSetIP sections now call out implementation-specific routing behavior.
- The post implied DNS and ServiceImport load balancing always work the same way across all implementations. Updated wording to say DNS or VIP routing load-balances according to the MCS implementation.
- The service export scope section implied `metadata.labels.export-to` is a standard MCS mechanism. The MCS API does not define this label's semantics, so the section now states that a controller or policy layer must implement it.
- The locality-aware load balancing section described `service.kubernetes.io/topology-mode: Auto` as preferring local cluster endpoints. Kubernetes documents it as Topology Aware Routing for same-zone endpoint preference, while Submariner separately prefers local-cluster services when available. Updated the wording accordingly.
- The CoreDNS troubleshooting snippet showed `lighthouse` directly in the cluster CoreDNS config. Submariner documentation shows cluster CoreDNS forwarding `clusterset.local` to the Lighthouse CoreDNS service, while the `lighthouse` plugin appears in the Lighthouse CoreDNS config. Updated the snippet to use `forward . <lighthouse-coredns-serviceip>`.

## Review Notes
The YAML examples use `multicluster.x-k8s.io/v1alpha1`, which remains consistent with current Submariner documentation. The upstream MCS API repository now also serves `v1beta1` and stores that version in its latest CRDs, so future updates should consider whether the target implementation supports `v1beta1` before switching examples.

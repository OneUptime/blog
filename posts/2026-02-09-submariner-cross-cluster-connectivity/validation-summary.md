# Validation Summary: How to Set Up Submariner for Cross-Cluster Pod-to-Pod and Service Connectivity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Submariner
- subctl
- Submariner Lighthouse service discovery
- Kubernetes Multi-Cluster Services API
- Kubernetes NetworkPolicy
- Globalnet

## Sources Consulted
- Submariner subctl command reference: https://submariner.io/operations/deployment/subctl/
- Submariner deployment guide: https://submariner.io/operations/deployment/
- Submariner architecture documentation: https://submariner.io/getting-started/architecture/
- Submariner service discovery architecture: https://submariner.io/getting-started/architecture/service-discovery/
- Submariner usage guide: https://submariner.io/operations/usage/
- Submariner Globalnet architecture: https://submariner.io/getting-started/architecture/globalnet/
- Submariner troubleshooting guide: https://submariner.io/operations/troubleshooting/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The broker section incorrectly said to export broker information with `subctl show versions`. Changed it to explain that `subctl deploy-broker` writes `broker-info.subm`, which is the file used by `subctl join`.
- The service export examples used the unsupported `submariner.io/export: "true"` Service annotation. Replaced those with the documented `subctl export service` workflow and an explicit `ServiceExport` example.
- The Globalnet broker command used `--globalnet-cidr`, which is a `join` flag. Changed the broker command to `--globalnet-cidr-range`.
- The Globalnet verification command checked the wrong namespace. Changed it to query `clusters.submariner.io` in the broker namespace, `submariner-k8s-broker`.
- The headless Service DNS example omitted the cluster ID segment required by Submariner for individual Pods. Changed it to `<pod-name>.<cluster-id>.<svc-name>.<namespace>.svc.clusterset.local`.
- The service export policy section described a non-existent `subctl join --label-selector` import filter. Replaced it with accurate guidance to create or remove `ServiceExport` resources.
- The firewall diagnostic command omitted the required remote context. Added `--remotecontext cluster-2`.
- The CoreDNS example used a `lighthouse` plugin block. Updated it to the documented CoreDNS forwarding pattern for `clusterset.local`.
- The tunnel monitoring example queried endpoint resources from the operator namespace and called them metrics. Changed it to query broker endpoint resources in `submariner-k8s-broker`.
- The NetworkPolicy example used a namespace selector that does not specifically represent remote cluster traffic. Changed it to an `ipBlock` example for a remote CIDR.

## Review Notes
The tutorial does not pin a Submariner version. The corrected commands match the current upstream Submariner documentation as of 2026-06-03, but users should still check `subctl version` and the matching documentation for version-specific behavior.

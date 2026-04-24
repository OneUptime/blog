# Validation Summary: How to Configure Cross-Cluster Service Discovery in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Submariner
- Lighthouse service discovery
- Kubernetes Multicluster Services API (`ServiceExport`, `ServiceImport`)
- `subctl`
- CoreDNS / `clusterset.local`

## Sources Consulted
- Submariner Getting Started: https://submariner.io/getting-started/
- Submariner `subctl` reference: https://submariner.io/operations/deployment/subctl/
- Submariner Rancher quickstart: https://submariner.io/getting-started/quickstart/managed-kubernetes/rancher/
- Submariner User Guide: https://submariner.io/operations/usage/
- Submariner NAT Traversal: https://submariner.io/operations/nat-traversal/
- Submariner Architecture: https://submariner.io/getting-started/architecture/
- Submariner Monitoring: https://submariner.io/operations/monitoring/
- SIG Multicluster `ServiceExport`: https://multicluster.sigs.k8s.io/api-types/service-export/
- Official `subctl` source for benchmark command semantics: https://github.com/submariner-io/subctl/blob/devel/cmd/subctl/benchmark.go
- Official `subctl` source for verify command semantics: https://github.com/submariner-io/subctl/blob/devel/cmd/subctl/verify.go
- Official `subctl` source for prefixed kubeconfig flags such as `--toconfig`: https://github.com/submariner-io/subctl/blob/devel/internal/restconfig/restconfig.go

## Issues Found
- The introduction described Submariner as a SUSE-backed project designed for Rancher environments. I updated this to describe Submariner as a CNCF Sandbox project that works with Rancher-managed clusters, which matches the official project documentation more closely.
- The prerequisites understated the networking requirements by listing only `4500/UDP` and describing it as a VXLAN/IPsec tunnel port. I corrected this to include the documented ports and protocols: `4500/UDP` for encapsulation, `4490/UDP` for NAT discovery, `4800/UDP` for the intra-cluster VXLAN path to gateway nodes, and ESP when gateways are directly reachable without NAT.
- The CIDR verification step only checked node `podCIDR` values while implying both Pod and Service CIDRs had been validated. I kept the Pod CIDR check and added a note to confirm Service CIDRs with `subctl show networks` after installing `subctl`.
- The broker section implied the broker should typically run on the Rancher management cluster and always showed `--globalnet`. I corrected this to say the broker can run on any cluster whose API server is reachable by all participants, and made `--globalnet` explicitly optional for overlapping CIDRs only.
- The join examples hard-coded `--natt=false`. I removed that from the default commands and clarified that it is only appropriate when gateways are directly reachable without NAT.
- The cluster connectivity check used `subctl benchmark latency --remoteconfig ... --intra-cluster`, which does not match the current benchmark command semantics. I replaced it with a `subctl verify` example using `--kubeconfig` and `--toconfig` plus `--only connectivity`.
- The service export example used `kubectl annotate service ... "submariner.io/export=true"`. I replaced that with the documented `subctl export service` flow and kept the direct `ServiceExport` resource example.
- The sample Deployment manifest in Step 8 was invalid for `apps/v1` because it omitted `.spec.selector` and matching pod labels. I added the required selector and template labels.
- The headless service DNS example omitted the required `<cluster-id>` segment. I corrected it to `postgres-0.cluster-1.postgres-headless.production.svc.clusterset.local`, which matches the Lighthouse headless service format.
- The monitoring section used `kubectl get endpoint`, which would inspect the core Kubernetes Endpoints resource rather than Submariner endpoint state, and it port-forwarded a non-documented `submariner-metrics` service. I replaced this with `subctl show endpoints` and a `ServiceMonitor` check for Prometheus Operator environments.
- The conclusion described Submariner as a service mesh. I corrected that to a connected multi-cluster network, since Submariner provides connectivity and service discovery rather than service-mesh features.

## Review Notes
- Official Submariner documentation states that service discovery requires Kubernetes 1.21 or later.
- The official Rancher quickstart for Submariner notes it was developed with Rancher v2.4.x. The core `subctl` workflow remains relevant, but Rancher UI details may differ on newer releases.
- The post still uses the Multicluster Services API version `multicluster.x-k8s.io/v1alpha1`, which matches current Submariner examples as of 2026-04-24.

# Validation Summary: How to Configure Cross-Cluster Service Discovery in Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Rancher (multi-cluster Kubernetes management)
- Submariner (cross-cluster L3 connectivity and service discovery)
- `subctl` CLI
- Kubernetes Multi-Cluster Services (MCS) API (`multicluster.x-k8s.io`)
- Lighthouse DNS (`clusterset.local`)
- Libreswan IPsec cable driver
- GlobalNet (Submariner NAT for overlapping CIDRs)

## Sources Consulted
- Submariner subctl reference: https://submariner.io/operations/deployment/subctl/
- Submariner service discovery architecture: https://submariner.io/getting-started/architecture/service-discovery/
- Submariner Rancher quickstart: https://submariner.io/getting-started/quickstart/managed-kubernetes/rancher/
- Kubernetes MCS API source (kubernetes-sigs/mcs-api): https://github.com/kubernetes-sigs/mcs-api/tree/master/pkg/apis/v1alpha1
- KEP-1645 (Multi-Cluster Services API)
- Rancher Manager docs: https://ranchermanager.docs.rancher.com/
- `https://get.submariner.io` install endpoint (verified reachable)

## Issues Found
- **Step 1 — Outdated Rancher UI path.** The original text said the Rancher UI exposes Submariner under "Cluster Management > Multi-cluster Management > Submariner." This path no longer exists in modern Rancher (2.7+). Rancher deprecated the legacy "Apps" cluster manager UI that previously hosted the Submariner integration, and the current Submariner Rancher quickstart documents only the `subctl` CLI workflow. The Rancher Manager docs site has no Submariner page at all. I rewrote the Step 1 intro to drop the bogus UI path and frame the CLI as the supported workflow, leaving the rest of the section (subctl install commands) intact.

## Review Notes
- All `subctl` commands and flags verified against the official subctl reference: `--kubeconfig` (global flag), `--globalnet`, `--clusterid` (one word, no hyphen), `--cable-driver libreswan`, and `subctl show connections` are all correct.
- ServiceExport `apiVersion: multicluster.x-k8s.io/v1alpha1` is the version Submariner Lighthouse currently uses (a v1beta1 exists upstream in mcs-api but is not yet what Submariner consumes).
- The `clusterset.local` DNS suffix and `<service>.<namespace>.svc.clusterset.local` format match the MCS spec / KEP-1645 and Submariner's Lighthouse DNS implementation.
- The `submariner-operator` namespace is correct for the gateway, route-agent, lighthouse, and operator pods on joined clusters. Note for future reference: the Broker itself runs in a separate namespace (`submariner-k8s-broker`) on the broker cluster — not material to Step 4 as written, but worth knowing if the post is ever expanded to cover broker troubleshooting.
- No version pinning is given for Submariner or `subctl`; readers should be aware the MCS API and Submariner CRDs are still evolving (v1alpha1 today).

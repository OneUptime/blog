# Validation Summary: How to Configure Cilium ClusterMesh for Multi-Cluster Pod Networking

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Cilium
- Cilium CLI
- Cilium ClusterMesh
- CiliumNetworkPolicy
- Kubernetes Services
- Prometheus metrics
- IPsec encryption

## Sources Consulted
- Cilium ClusterMesh setup documentation: https://docs.cilium.io/en/stable/network/clustermesh/clustermesh/
- Cilium CLI `install` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_install/
- Cilium CLI `clustermesh enable` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_clustermesh_enable/
- Cilium CLI `clustermesh connect` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_clustermesh_connect/
- Cilium load-balancing and service discovery documentation: https://docs.cilium.io/en/stable/network/clustermesh/services/
- Cilium service affinity documentation: https://docs.cilium.io/en/latest/network/clustermesh/affinity/
- Cilium multi-cluster network policy documentation: https://docs.cilium.io/en/stable/network/clustermesh/policy/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium IPsec transparent encryption documentation: https://docs.cilium.io/en/latest/security/network/encryption-ipsec/
- Cilium ClusterMesh troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting_clustermesh/

## Issues Found
- The Cilium CLI installation snippet used the old `master` branch URL and hard-coded `amd64`. Updated it to the official `main` branch URL with architecture detection and `--fail`.
- The `cilium install` examples used unsupported/currently outdated direct flags such as `--cluster-name`, `--cluster-id`, `--ipam`, and `--kube-proxy-replacement strict`. Replaced them with documented Helm values passed through `--set`, including `cluster.name`, `cluster.id`, `ipam.mode`, and `kubeProxyReplacement=true`.
- The description of installation said ClusterMesh was enabled during `cilium install`. Clarified that installation sets the ClusterMesh-ready name and ID; `cilium clustermesh enable` enables ClusterMesh.
- The ClusterMesh connect example used `--context cluster-2` as if it selected the destination. Updated it to `--context cluster-1 --destination-context cluster-2`.
- The shell loop inside the curl pod used Bash brace expansion while launching `sh`. Replaced it with `seq` so the command works in POSIX-style shells.
- The global service `shared` annotation comment said it shares the service definition. Corrected it to sharing local endpoints across clusters.
- The detailed ClusterMesh status command used `cilium clustermesh status --verbose` inside the Cilium pod. Updated it to the documented `cilium-dbg status --all-clusters`.
- The metrics section listed non-documented metric names and a misleading `9090` DaemonSet port-forward. Replaced it with documented metrics enablement values and current Cilium/ClusterMesh metric names.
- The troubleshooting wording referred to testing between cluster API servers. Corrected it to ClusterMesh API servers on port 2379.
- The external IP example used an undocumented `--apiserver-advertise-address` flag for `cilium clustermesh enable`. Replaced it with the documented `--destination-endpoint` option on `cilium clustermesh connect`.
- The IPsec install example used obsolete flags and the key example omitted the recommended `+` per-tunnel key marker. Updated both examples to current Cilium documentation.

## Review Notes
The post remains a general ClusterMesh guide rather than a version-pinned guide. Future updates should re-check Cilium CLI flags and metric names against the Cilium release current at publication time.

# Validation Summary: How to Set Up Federation Across Talos Linux Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- KubeFed / Kubernetes Federation v2
- Liqo
- Cilium ClusterMesh
- Helm
- kubectl

## Sources Consulted
- KubeFed archived repository: https://github.com/kubernetes-retired/kubefed
- KubeFed installation documentation: https://github.com/kubernetes-retired/kubefed/blob/master/docs/installation.md
- KubeFed cluster registration documentation: https://github.com/kubernetes-retired/kubefed/blob/master/docs/cluster-registration.md
- KubeFed user guide and ReplicaSchedulingPreference documentation: https://github.com/kubernetes-retired/kubefed/blob/master/docs/userguide.md
- KubeFed v0.10.0 Helm chart and values from the official release artifact: https://github.com/kubernetes-sigs/kubefed/releases/download/v0.10.0/kubefed-0.10.0.tgz
- Liqo CLI installation documentation: https://docs.liqo.io/en/stable/installation/liqoctl.html
- Liqo installation command reference: https://docs.liqo.io/en/latest/usage/liqoctl/liqoctl_install.html
- Liqo peering documentation: https://docs.liqo.io/en/v1.0.3/usage/peer.html
- Liqo peer command reference: https://docs.liqo.io/en/latest/usage/liqoctl/liqoctl_peer.html
- Cilium ClusterMesh setup documentation: https://docs.cilium.io/en/stable/network/clustermesh/clustermesh/
- Cilium ClusterMesh command reference: https://docs.cilium.io/en/latest/cmdref/cilium_clustermesh_enable.html

## Issues Found
- KubeFed was described as the official federation project. The upstream repository is archived and read-only, so the post now describes it as the retired Kubernetes SIG Multicluster federation project.
- The introductory claim implied cluster federation automatically shifts traffic after a failure. Federation alone does not provide global traffic failover, so the wording now requires health checks and global traffic routing.
- The Helm value for controller manager replicas used `controllermanager.replicaCount`, but the chart uses `controllermanager.controller.replicaCount`. The command was corrected.
- The KubeFed example created namespaced federated resources without federating the namespace. Added `kubefedctl federate namespace default`.
- The Liqo installation example only installed the CLI with `curl | bash` and did not install Liqo into the clusters. Replaced it with the current `liqoctl` binary installation and `liqoctl install` commands using explicit Pod and Service CIDRs.
- The Liqo peering example used an outdated `generate peer-command` workflow. Replaced it with the current `liqoctl peer --remote-kubeconfig ...` flow.
- The Liqo workload example scheduled directly to a virtual node without first offloading a namespace. Added namespace creation and `liqoctl offload namespace`, and placed the Deployment in that namespace.
- The Cilium ClusterMesh section omitted key prerequisites and overstated encryption. Added non-overlapping Pod CIDR and node InternalIP reachability requirements, and clarified that encryption depends on Cilium encryption configuration.
- The KubeFed log selector used `control-plane=controller-manager`, but the chart labels controller manager pods with `kubefed-control-plane=controller-manager`. The command was corrected.

## Review Notes
KubeFed is usable as a historical/retired project but is no longer actively maintained. Future revisions should consider emphasizing current SIG Multicluster work or Liqo-first approaches for production guidance.

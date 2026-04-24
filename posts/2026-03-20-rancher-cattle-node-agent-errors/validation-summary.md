# Validation Summary: How to Troubleshoot cattle-node-agent Errors in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher RKE
- Kubernetes
- Docker
- `kubectl`
- Rancher agents (`cattle-cluster-agent`, `cattle-node-agent`, `rancher-system-agent`)

## Sources Consulted
- Rancher Agents: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/about-rancher-agents
- Communicating with Downstream User Clusters: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/rancher-manager-architecture/communicating-with-downstream-user-clusters
- Registered Clusters: https://ranchermanager.docs.rancher.com/v2.13/troubleshooting/other-troubleshooting-tips/registered-clusters
- Troubleshooting Worker Nodes and Generic Components: https://ranchermanager.docs.rancher.com/v2.10/troubleshooting/kubernetes-components/troubleshooting-worker-nodes-and-generic-components
- Networking: https://ranchermanager.docs.rancher.com/troubleshooting/other-troubleshooting-tips/networking
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Kubernetes Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Docker image save: https://docs.docker.com/reference/cli/docker/image/save/
- Docker image load: https://docs.docker.com/reference/cli/docker/image/load/
- Docker container restart: https://docs.docker.com/reference/cli/docker/container/restart/
- RKE2 CLI Tools: https://docs.rke2.io/reference/cli_tools
- K3s Embedded Registry Mirror: https://docs.k3s.io/installation/registry-mirror

## Issues Found
- The introduction overstated the scope of `cattle-node-agent` by describing it as a component on every Rancher-managed cluster. I corrected it to Rancher-launched RKE clusters and added the current RKE2/K3s caveat that those clusters use `rancher-system-agent`.
- The architecture section incorrectly implied that `cattle-cluster-agent` directly manages `cattle-node-agent`. I rewrote the diagram to reflect Rancher's documented primary connection through `cattle-cluster-agent` and fallback node-agent connectivity.
- The image-pull troubleshooting section hardcoded `rancher/rancher-agent:v2.9.0`, which is version-fragile and may not match the live cluster. I changed it to read the exact image from the running DaemonSet before mirroring it.
- The air-gap import commands used `ctr` and RKE2/K3s-specific paths, which do not match the corrected `cattle-node-agent` scope. I replaced them with Docker `save` and `load` commands appropriate for Rancher-launched RKE clusters.
- The volume-mount section listed containerd and K3s/RKE2 socket paths that were out of scope for a `cattle-node-agent` article. I narrowed the guidance to the Docker socket path used on RKE nodes.
- The network section incorrectly suggested checking port `10250` as if it were a `cattle-node-agent` listener. I replaced that with checks for Rancher `server-url` reachability, websocket or certificate errors in agent logs, and Rancher load balancer requirements.
- The recovery section used `systemctl status kubelet` and `systemctl restart rke2-agent`, which are wrong for Rancher-launched RKE clusters where Rancher documents kubelet troubleshooting via Docker containers. I replaced those commands with Docker-based kubelet inspection, logging, and restart steps.
- The disk-cleanup section used `crictl rmi --prune`, which was out of scope for this RKE-focused article. I simplified it to Docker image pruning.

## Review Notes
- The post is now technically accurate for Rancher-launched RKE clusters. For Rancher-provisioned RKE2 or K3s clusters, the equivalent troubleshooting target is `rancher-system-agent`, not `cattle-node-agent`.
- The commands assume SSH access to the cluster nodes and a Docker-based RKE environment.

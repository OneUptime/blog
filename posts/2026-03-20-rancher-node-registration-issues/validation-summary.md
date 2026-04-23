# Validation Summary: How to Troubleshoot Node Registration Issues in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RKE2
- K3s
- Linux systemd services and host networking

## Sources Consulted
- Rancher: Launching Kubernetes on Existing Custom Nodes - https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/use-existing-nodes
- Rancher: Communicating with Downstream User Clusters - https://ranchermanager.docs.rancher.com/v2.13/reference-guides/rancher-manager-architecture/communicating-with-downstream-user-clusters
- Rancher: Registered Clusters - https://ranchermanager.docs.rancher.com/v2.13/troubleshooting/other-troubleshooting-tips/registered-clusters
- Rancher: Using API Tokens - https://ranchermanager.docs.rancher.com/api/api-tokens
- Rancher: Removing Kubernetes Components from Nodes - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/clean-cluster-nodes
- RKE2: Quick Start - https://docs.rke2.io/install/quickstart
- RKE2: Requirements - https://docs.rke2.io/install/requirements
- RKE2: Logging - https://docs.rke2.io/reference/logging
- RKE2: CLI Tools - https://docs.rke2.io/reference/cli_tools
- K3s: Requirements - https://docs.k3s.io/installation/requirements
- K3s: Uninstalling K3s - https://docs.k3s.io/installation/uninstall
- Kubernetes: Nodes - https://kubernetes.io/docs/concepts/architecture/nodes/
- Kubernetes: Swap memory management - https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- Kubernetes: API health endpoints - https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes: kubectl drain - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The post mixed current Rancher custom-node provisioning with older RKE-specific `docker run rancher-agent` behavior. I replaced that with accurate guidance that Rancher generates the registration command in the UI for current custom-node flows, and clarified that Docker-based `rancher-agent` applies to older RKE custom clusters.
- The registration flow incorrectly implied `kubectl apply` was part of adding a node and treated `cattle-node-agent` as universal. I corrected the flow to reflect Rancher-provisioned RKE2/K3s nodes using `rancher-system-agent`, kubelet registration, and `cattle-cluster-agent`, while noting `cattle-node-agent` is specific to older RKE clusters.
- The post said invalid registration tokens were typically expired. I changed this to stale, revoked, wrong-cluster, or CA/server-mismatch cases because Rancher documents agent deployment tokens as typically long-lived unless revoked.
- The network troubleshooting section checked the wrong join path for RKE2 by focusing only on the API server. I updated it to verify the Rancher server on 443, RKE2 join traffic on 9345 plus 6443, and K3s join traffic on 6443, matching the official networking requirements.
- The swap guidance was outdated (`pre-v1.22`). I corrected it to the current Kubernetes behavior: on Linux, kubelet will not start with swap enabled unless configured otherwise.
- The kubelet debugging section used the wrong log source for RKE2 (`journalctl -u kubelet`) and mislabeled a `kubectl get nodes` check as kubelet logging. I updated it to use the RKE2 kubelet log file path and clarified that the admin kubeconfig check is run from an RKE2 server/control-plane node.
- The cleanup section omitted removal of `rancher-system-agent` and used the wrong K3s uninstall command for agent nodes. I added the documented Rancher system-agent uninstall step and corrected the K3s agent cleanup command to `k3s-agent-uninstall.sh`, with a note that K3s server nodes use `k3s-uninstall.sh`.

## Review Notes
- The revised post now distinguishes current Rancher RKE2/K3s custom-node provisioning from older RKE custom clusters, which is important because both still appear in real environments.
- The connectivity checks use `nc -zv`; if `netcat` is not installed on a target host, an equivalent TCP connectivity test can be used instead.

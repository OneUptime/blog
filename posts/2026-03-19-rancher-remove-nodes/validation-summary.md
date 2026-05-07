# Validation Summary: How to Remove Nodes from a Rancher-Managed Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- `kubectl`
- RKE2
- K3s
- etcd

## Sources Consulted
- Rancher docs: Nodes and Machine Pools: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/manage-clusters/nodes-and-machine-pools
- Rancher docs: Removing Kubernetes Components from Nodes: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/clean-cluster-nodes
- Kubernetes docs: `kubectl drain`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes docs: `kubectl top`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes docs: kubectl Quick Reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Kubernetes docs: Node Status: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes docs: Nodes: https://kubernetes.io/docs/concepts/architecture/nodes/
- Kubernetes docs: Deprecated API Migration Guide: https://v1-33.docs.kubernetes.io/docs/reference/using-api/deprecation-guide/
- RKE2 docs: High Availability: https://docs.rke2.io/install/ha
- RKE2 docs: Uninstall: https://docs.rke2.io/install/uninstall
- K3s docs: Uninstalling K3s: https://docs.k3s.io/installation/uninstall
- etcd docs: Runtime reconfiguration: https://etcd.io/docs/v3.5/op-guide/runtime-configuration/
- etcd docs: How to check Cluster status: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/

## Issues Found
- The post used `kubectl top nodes`, but the supported subcommand is `kubectl top node`. I corrected the command and noted that `kubectl top` requires Metrics Server.
- The cordon verification note implied the node status would only show `SchedulingDisabled`. I corrected it to say the status should include `SchedulingDisabled`, which matches Kubernetes behavior.
- The Rancher UI drain options were described using Kubernetes CLI-style flags. I updated this to Rancher's documented safe/aggressive drain behavior plus grace period and timeout.
- The drain troubleshooting guidance treated `--force` as a general fix for local storage. I corrected this so `--delete-emptydir-data` is only used when loss of `emptyDir` data is acceptable, while `--force` remains tied to unmanaged pods.
- The Rancher UI delete instructions were written as if the action is universally available. I scoped that step to Rancher-launched/custom cluster node types that actually expose the Delete action.
- The `kubectl delete node` example lacked an important behavioral caveat. I added that it removes only the Kubernetes Node object and that a still-running kubelet or Rancher-managed agent can cause the node to re-register.
- The cloud-managed cluster guidance was too narrow. I updated it to reflect that node-group or node-pool scale-down may be done through cluster editing or directly in the cloud provider, depending on how the cluster is managed.
- The cleanup section incorrectly implied manual cleanup was the normal path for custom clusters and used the wrong Rancher/RKE2 cleanup flow. I corrected it to note that Rancher automatically cleans active nodes on removal, and that manual cleanup is mainly for unreachable nodes.
- The cleanup commands used `systemctl stop/disable rancher-system-agent` instead of Rancher's documented `system-agent-uninstall.sh` flow, and used a hard-coded RKE2 uninstall path that is not valid for all install methods. I replaced those with the documented uninstall commands.
- The cleanup section removed only a small subset of Rancher/Kubernetes artifacts. I expanded the file and directory cleanup list to match Rancher's documented manual cleanup guidance more closely.
- The workload verification step sorted events by `.lastTimestamp`, which is deprecated for newer Event APIs. I updated it to sort by `.metadata.creationTimestamp`, consistent with current Kubernetes documentation.
- The etcd section had a heading about health checks but only listed cluster members. I updated it to include both member listing and an actual `endpoint health --cluster` check.
- The post verified etcd health against only the local endpoint after removal. I updated the command to use `endpoint health --cluster` so it validates cluster-wide health.

## Review Notes
- The guide now correctly reflects that Rancher node lifecycle behavior varies by cluster type. Rancher-launched clusters, hosted clusters, and registered/imported clusters do not expose exactly the same node management actions.
- `kubectl top` remains a convenience check, not a full capacity-planning tool, and it only works when Metrics Server is installed.

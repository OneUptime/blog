# Validation Summary: How to Configure AKS with Custom Node Configuration for Kernel Parameters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CLI
- Kubernetes kubelet configuration
- Linux sysctl and kernel tuning
- Kubernetes pod securityContext sysctls

## Sources Consulted
- Microsoft Learn: Customize the node configuration for AKS node pools: https://learn.microsoft.com/en-us/azure/aks/custom-node-configuration
- Microsoft Learn: Azure CLI `az aks nodepool add`: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn: Azure CLI / SSH key examples for `az aks create`: https://learn.microsoft.com/en-us/azure/aks/manage-ssh-node-access
- Microsoft Learn: AKS REST API Agent Pools - Create Or Update, SysctlConfig schema: https://learn.microsoft.com/en-us/rest/api/aks/agent-pools/create-or-update
- Kubernetes documentation: Using sysctls in a Kubernetes cluster: https://kubernetes.io/docs/tasks/administer-cluster/sysctl-cluster/
- Kubernetes documentation: Node resource managers / CPU Manager static policy: https://kubernetes.io/docs/concepts/policy/node-resource-managers/

## Issues Found
- The Linux OS config examples used `netIpv4TcpKeepaliveIntvl`. The current AKS SysctlConfig schema uses `netIpv4TcpkeepaliveIntvl` for `net.ipv4.tcp_keepalive_intvl`, so the JSON property was corrected in both examples.
- The explanation called out `fsFileMax` as essential for increasing system-wide file descriptors. Current AKS documentation lists `fs.file-max` defaults as already set to the signed 64-bit maximum on supported current Linux node images, while `fs.nr_open` controls the per-process file-handle maximum. The wording was changed to explain `fsNrOpen` instead.

## Review Notes
- The Azure CLI commands use supported `--linux-os-config` and `--kubelet-config` flags for cluster creation and node pool creation.
- The kubelet configuration fields and values are within the supported AKS Linux kubelet custom configuration set.
- The pod-level sysctl example is valid for namespaced sysctls when the relevant unsafe sysctls are allowed on the node pool. Some listed TCP sysctls are safe by default in newer Kubernetes versions, but the example remains valid.

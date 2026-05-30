# Validation Summary: How to Troubleshoot AKS Node NotReady Status and Recover Unresponsive Nodes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes nodes, kubelet, leases, taints, and evictions
- kubectl node debugging and draining
- Azure CLI VMSS operations
- containerd and Linux node diagnostics

## Sources Consulted
- Kubernetes Node Status documentation: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes kubectl node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes API-initiated eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/
- Kubernetes node-pressure eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- AKS node access documentation: https://learn.microsoft.com/en-us/azure/aks/node-access
- AKS node auto-repair documentation: https://learn.microsoft.com/en-us/azure/aks/node-auto-repair
- Azure CLI VMSS command reference: https://learn.microsoft.com/en-us/cli/azure/vmss

## Issues Found
- The post said a node becomes NotReady after a default 40-second heartbeat timeout. Updated the wording to use the Kubernetes node controller `node-monitor-grace-period` default of 50 seconds and clarified that kubelet also renews Lease objects.
- The post implied pod eviction starts directly when kubelet status updates stop. Updated the wording to note that existing pods may be evicted after Kubernetes applies the relevant `NoExecute` taint.
- The post suggested an OOM killer could restart the node. Updated the event explanation because the OOM killer kills processes; it does not directly reboot a node.
- The `kubectl debug node` command used an older CBL-Mariner image and did not ensure privileges for `chroot /host`. Updated it to the current AKS Azure Linux debug image and added `--profile=sysadmin`.
- The resource-check commands could run against the debug container filesystem if the user had not already entered the host root. Added `chroot /host` before resource inspection.
- The API server check used `/healthz`. Updated it to `/readyz`, which is the current Kubernetes readiness endpoint.
- The network troubleshooting text listed Azure CNI IP exhaustion as a likely cause of node-to-API-server connectivity failure. Replaced it with egress/firewall blocking, which is more directly relevant.
- The node replacement section assumed cluster autoscaler would always replace a deleted VMSS instance. Updated it to mention VMSS or cluster autoscaler replacement depending on node pool configuration.
- The prevention section overstated that missing limits alone let a pod take down a node via CPU or memory. Updated it to more accurately describe unexpected resource consumption and workload disruption.
- The auto-repair section used an unsupported-looking `az aks show --query "autoRepairProfile"` verification example. Replaced it with a Kubernetes event query for AKS auto-repair events.
- The PDB section claimed PDBs protect availability when pods are evicted from a NotReady node. Updated it to clarify that PDBs apply to voluntary/API-initiated evictions such as `kubectl drain`, but not every node failure or kubelet node-pressure eviction.

## Review Notes
The local environment did not have `az` or `kubectl` installed, so CLI syntax was verified against official Microsoft Learn and Kubernetes command documentation rather than local `--help` output.

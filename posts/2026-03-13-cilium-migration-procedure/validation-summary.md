# Validation Summary: Cilium CNI Migration Procedure: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Cilium
- Kubernetes
- Kubernetes CNI
- Helm
- kubectl
- Cilium CLI

## Sources Consulted
- Cilium official migration guide: https://docs.cilium.io/en/stable/installation/k8s-install-migration/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium CNI configuration documentation: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/#drain
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post described `cni.exclusive=false` chained mode as the recommended live migration path. Cilium's official migration procedure uses secondary mode with `cni.customConf=true`, `cni.uninstall=false`, a distinct Cilium CIDR and overlay, and `CiliumNodeConfig` to enable Cilium CNI per labeled node. Updated the migration approach and commands.
- The Helm example used `tunnel=vxlan` and reused the common `10.244.0.0/16` pod CIDR. Updated the values to current Cilium Helm fields (`routingMode`, `tunnelProtocol`, `tunnelPort`) and used a distinct example CIDR.
- The node migration steps manually removed old CNI config with `kubectl debug`, which is not the documented Cilium migration flow and omitted the required per-node label, Cilium restart, and node reboot. Replaced those steps with the documented label/restart/reboot sequence.
- Several in-pod Cilium debug commands used `cilium` where current documentation uses `cilium-dbg`. Updated status, config, and endpoint inspection examples.
- The post used `cilium status --brief`, which is not a valid Cilium CLI status flag. Replaced it with `cilium status`.
- Final cutover was missing key post-migration Cilium settings and cleanup. Added `cni.customConf=false`, unmanaged pod watcher restart, optional host legacy routing reset, DaemonSet restart, and `CiliumNodeConfig` deletion.
- The monitoring diagram and conclusion still implied non-exclusive/chained mode and old pods retained old-CNI IPs on the migrated node. Updated wording to reflect secondary mode, per-node migration, and old CNI use on unmigrated nodes.

## Review Notes
The corrected procedure remains version-sensitive and cluster-specific. Cilium's migration guide warns that live migration depends heavily on the existing CNI, CIDRs, overlay protocol/ports, and NetworkPolicy provider, so future revisions should pin a tested Cilium version or explicitly instruct readers to generate version-matched Helm values with the Cilium CLI before production use.

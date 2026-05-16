# Validation Summary: How to Upgrade Talos Linux Control Plane Nodes Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes control plane
- kubectl
- etcd

## Sources Consulted
- Talos Linux upgrade guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos v1.7 CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli
- Talos latest CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos machine configuration editing guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos etcd maintenance guide: https://docs.siderolabs.com/talos/v1.11/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/
- Kubernetes node labels documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/
- etcd FAQ on quorum and failure tolerance: https://etcd.io/docs/v3.5/faq/

## Issues Found
- The post described a Talos control-plane node upgrade as temporarily removing the node from the cluster. Changed this to "taking it offline" because the etcd member is offline during reboot but is not necessarily removed from cluster membership.
- Several `talosctl etcd status` examples queried only one node while the surrounding text claimed all members were being checked. Updated those examples to target all three control plane nodes.
- The machine configuration backup command saved the full `machineconfig` resource wrapper. Updated it to use `talosctl get machineconfig v1alpha1 -o jsonpath='{.spec}'`, matching Talos documentation for retrieving the machine configuration itself.
- The post used `talosctl services`, but the documented current command is `talosctl service`. Updated service status examples, including the kubelet status check.
- The troubleshooting section used `talosctl etcd join`, which is not a documented current Talos subcommand. Removed that command and changed the guidance to remove the broken member and recover the node with fresh state.
- The post implied Kubernetes API server component images might change as part of a Talos OS upgrade. Added a note that Talos OS upgrades do not upgrade Kubernetes by default.
- The upgrade timeout section mentioned pre-pulling the installer image without a documented Talos command for that workflow. Removed that claim and kept the supported timeout guidance.

## Review Notes
The example installer image uses Talos `v1.7.0`, which is no longer the latest Talos release as of this review date. The commands are valid for the version shown, but future readers should choose the target installer image from the release they are actually upgrading to and follow Talos' recommended adjacent-minor upgrade path.

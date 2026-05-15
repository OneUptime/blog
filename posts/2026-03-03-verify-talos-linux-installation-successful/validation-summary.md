# Validation Summary: How to Verify Talos Linux Installation Was Successful

## Status
validated

## Post Type
Tutorial / operational verification guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- kubectl
- etcd
- CoreDNS
- container networking / CNI

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux troubleshooting guide: https://docs.siderolabs.com/talos/v1.11/troubleshooting/troubleshooting
- Talos Linux disk layout and disk management documentation: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout
- Talos Linux v1.9 "What's New" notes for removed `talosctl disks`: https://docs.siderolabs.com/talos/v1.9/getting-started/what%27s-new-in-talos
- Talos Linux etcd maintenance documentation: https://www.talos.dev/v1.12/advanced/etcd-maintenance/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The post used `talosctl services`, but the current official CLI reference documents the command as `talosctl service`. Updated both control plane and worker examples.
- The post used `talosctl disks`, but Talos v1.9 removed that command. Updated the disk check to use `talosctl get disks` and added `talosctl get discoveredvolumes` for partition and volume verification.
- The post said `talosctl time` output shows the NTP server a node is syncing with. The official CLI reference describes `talosctl time` as returning current server time, with `--check` available to compare against a specified NTP server. Updated the wording and added a `--check pool.ntp.org` example.
- The post listed EFI, BOOT, META, STATE, and EPHEMERAL as universally expected partitions. Official disk layout docs describe EFI, META, STATE, and EPHEMERAL as the default layout, while discovered volumes can show BOOT or BIOS depending on version and firmware mode. Updated the wording to avoid an unconditional partition claim.

## Review Notes
The Kubernetes examples use current `kubectl run`, `kubectl create deployment`, `kubectl rollout status`, and `kubectl expose` command forms. The `talosctl health` section is technically reasonable, but for multi-node clusters users may need to provide explicit `--control-plane-nodes` and `--worker-nodes` if discovery or local configuration does not provide the full cluster membership.

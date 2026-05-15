# Validation Summary: How to Wipe EPHEMERAL Partition to Reset etcd in Talos

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- talosctl
- etcd
- Kubernetes
- Talos system partitions and volumes

## Sources Consulted
- Talos Linux v1.12 Disk Layout: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout/
- Talos Linux v1.12 System Volumes: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/system/
- Talos Linux v1.12 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux Resetting a Machine guide: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/lifecycle-management/resetting-a-machine
- Talos Linux Disaster Recovery guide: https://docs.siderolabs.com/talos/v1.7/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery
- Talos Linux v1.12 API reference: https://docs.siderolabs.com/talos/v1.12/reference/api

## Issues Found
- Reset examples omitted `--reboot=true` while the surrounding text and scripts expected the nodes to reboot and come back automatically. Talos documents `--reboot` as the flag that reboots after reset instead of shutting down, so all reset examples that expect a reboot were updated to include `--reboot=true`.
- The mount inspection command used `talosctl get mounts`, but the current CLI reference documents `talosctl mounts` for listing mounts. Updated the command.
- File listing examples used `talosctl ls`; the current CLI reference documents `talosctl list`, so the examples were updated to the documented command.
- Service inspection used `talosctl services`, but the current CLI command is `talosctl service`. Updated the command.
- Machine configuration verification used `talosctl get machineconfig` without the resource ID. Talos documentation shows `talosctl get machineconfig v1alpha1` for retrieving the machine configuration resource, so the example was updated.
- The full reset example said the node goes back to maintenance mode without noting reboot behavior. It now includes `--reboot=true` and says the node reboots into maintenance mode if bootable.

## Review Notes
The guide is technically relevant and aligns with Talos documentation after the command corrections. The local environment did not have `talosctl` installed, so CLI verification was performed against official Sidero/Talos documentation rather than local `--help` output.

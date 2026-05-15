# Validation Summary: How to Use talosctl reset to Factory Reset Nodes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- etcd
- Shell scripting

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux resetting a machine guide: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/lifecycle-management/resetting-a-machine
- Talos Linux scaling down guide: https://www.talos.dev/v1.10/talos-guides/howto/scaling-down/
- Talos Linux disk layout documentation: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout/
- Kubernetes kubectl cordon reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The post said `talosctl reset` reboots into maintenance mode by default. Current Talos CLI documentation states that `--reboot` must be set to reboot after reset; otherwise the node shuts down. Updated the default behavior descriptions and added `--reboot` to examples that expect maintenance mode.
- The post documented a `--shutdown` flag. Current Talos CLI documentation does not list `--shutdown`; shutdown is the default behavior when `--reboot` is omitted. Replaced the example and explanation.
- The post said reset defaults to wiping only the STATE and EPHEMERAL partitions. Current Talos CLI documentation lists `--wipe-mode all` as the default. Updated the description and clarified that `--system-labels-to-wipe STATE --system-labels-to-wipe EPHEMERAL` limits the reset to those partitions.
- The post stated that Talos remains installed on the BOOT partition after reset as a default outcome. Because the current default wipe mode can wipe selected disks rather than only STATE and EPHEMERAL, updated the text to recommend explicit system labels when preserving boot partitions is intended.
- The partition descriptions placed etcd data under STATE. Talos disk layout documentation states that STATE stores machine configuration and system state, while EPHEMERAL stores container data, logs, and etcd data for control plane nodes. Updated the partition descriptions.
- The post said maintenance mode does not use TLS. Current CLI help describes the maintenance service as insecure because it is unauthenticated. Updated the explanation to avoid the inaccurate TLS claim.

## Review Notes
The local environment did not have `talosctl` installed, so CLI verification was performed against official Sidero Labs/Talos documentation. The Kubernetes `kubectl cordon` and `kubectl drain --ignore-daemonsets --delete-emptydir-data` examples are consistent with the official Kubernetes command reference.

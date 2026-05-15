# Validation Summary: How to View Talos Linux Service Status

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes node services
- etcd
- kubelet
- containerd

## Sources Consulted
- Sidero Labs Talos v1.13 CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Sidero Labs Talos v1.13 logging documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/logging-and-telemetry/logging
- Sidero Labs Talos v1.13 Talos for Linux Admins: https://docs.siderolabs.com/talos/v1.13/learn-more/talos-for-linux-admins
- Sidero Labs Talos v1.13 Components documentation: https://docs.siderolabs.com/talos/v1.13/learn-more/components
- Sidero Labs Talos v1.13 Network Connectivity documentation: https://docs.siderolabs.com/talos/v1.13/learn-more/talos-network-connectivity

## Issues Found
- The post used `talosctl get systemstat --nodes <node-ip>` as a disk usage check. Talos documentation maps disk usage to `talosctl usage`, while `SystemStat` is a system statistics API resource, so the command was changed to `talosctl usage --nodes <node-ip>`.
- The post said `talosctl service etcd` gives events history and a container ID. The current CLI reference describes it as a service status command, and official service examples show state, health, last change, and last event. The bullet list was corrected to those fields.
- The kubelet troubleshooting command comment said `talosctl services --nodes <node-ip> | grep kubelet` checks API server reachability. That command only filters service status output, so the comment was corrected to say it checks kubelet status for API server-related health errors.

## Review Notes
The official Talos Linux administrator guide still documents `talosctl services` as the `systemctl status` equivalent, while the CLI reference documents the singular `talosctl service` command for service status and control. The post's use of `talosctl services` is consistent with official examples and was left intact.

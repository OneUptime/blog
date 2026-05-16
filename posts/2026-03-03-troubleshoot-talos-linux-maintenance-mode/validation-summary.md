# Validation Summary: How to Troubleshoot Talos Linux Maintenance Mode

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Talos machine configuration
- Talos maintenance mode
- etcd member management
- Talos OS upgrades and rollback

## Sources Consulted
- Talos/Sidero documentation: The insecure flag: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/system-configuration/insecure
- Talos/Sidero documentation: talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos/Sidero documentation: Machine configuration overview: https://docs.siderolabs.com/talos/v1.12/reference/configuration/overview
- Talos/Sidero documentation: Editing live machine configuration: https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos/Sidero documentation: Network connectivity: https://www.talos.dev/v1.10/learn-more/talos-network-connectivity/
- Talos/Sidero documentation: Upgrading Talos Linux: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/lifecycle-management/upgrading-talos

## Issues Found
- The post referred to a "configuration partition"; changed this to the STATE partition because Talos stores persisted machine state/configuration there.
- The network connectivity check used `curl -k https://<node-ip>:50000`, which is not a reliable Talos API check because the API is not a normal HTTP endpoint for troubleshooting. Changed it to `nc -vz <node-ip> 50000` to test TCP reachability.
- Several examples used `talosctl get machineconfiguration`, but the current resource name documented by Talos is `machineconfig`. Updated those commands.
- The disk inspection example used the older `talosctl disks` form. Updated it to `talosctl get disks`, matching current Talos documentation.
- The troubleshooting section used `talosctl logs ... --insecure`; Talos documents only a limited subset of commands for maintenance-mode insecure access, and `logs` is not in that subset. Replaced it with `talosctl get machinestatus --insecure -o yaml` and `talosctl get events --insecure`.
- The upgrade recovery section suggested re-applying configuration as the way to force a previous good Talos boot. Updated it to use `talosctl rollback` when authenticated access is available, and kept re-applying configuration/reset as the fallback for nodes only reachable through maintenance mode.
- The examples that save current machine configuration now extract `.spec` with `yq`, because `talosctl get machineconfig -o yaml` returns an API resource while `talosctl apply-config` expects the raw machine configuration.

## Review Notes
The post is generally accurate after these corrections. Some maintenance-mode `talosctl get` resources can vary by Talos version and resource sensitivity, so in future updates it may be useful to show `talosctl get rd --insecure` as a discovery step before querying optional resources.

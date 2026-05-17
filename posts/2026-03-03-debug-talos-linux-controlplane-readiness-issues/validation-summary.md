# Validation Summary: How to Debug Talos Linux Controlplane Readiness Issues

## Status
validated

## Post Type
Guide / Tutorial — a systematic, step-by-step debugging workflow for Talos Linux control plane readiness problems.

## Technologies Covered
- Talos Linux (talosctl CLI, COSI resources, services)
- Kubernetes control plane (kube-apiserver, kubelet, static pods)
- etcd (bootstrap, member management, disk latency)
- Container Runtime Interface (CRI) / containerd
- Networking primitives (addresses, routes, DNS resolvers, VIP)

## Sources Consulted
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.8/reference/cli/
- talosctl CLI reference (v1.9): https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Networking resources reference: https://docs.siderolabs.com/talos/v1.8/learn-more/networking-resources/
- Controllers and Resources: https://docs.siderolabs.com/talos/v1.8/learn-more/controllers-resources/
- Editing machine configuration: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/editing-machine-configuration

## Issues Found
1. **`talosctl get events` is not a valid command.** Events are not exposed as a COSI resource via `get`. The correct top-level command is `talosctl events` (streams runtime events). Updated Step 9 to use `talosctl events --nodes ...`.
2. **`talosctl get certificates` (plural) is not the canonical form.** The documented singular form is `talosctl get certificate`. Updated Step 4 ("Certificate Problems") to use the singular resource name for safety across Talos versions.
3. **`talosctl stats` was described as "Check CPU usage,"** which is misleading. The command shows per-container statistics (CPU%, memory, PIDs, disk) from containerd, not node-level CPU usage. Updated the comment in Step 8 to "Check per-container CPU and memory stats" so readers do not expect a system-wide CPU view.

## Review Notes
- All other talosctl commands and flags verified against official documentation: `talosctl health` (with `--wait-timeout`), `services`, `logs <service>`, `etcd members`, `etcd remove-member <id>`, `bootstrap`, `containers -k`, `get hostname`, `get addresses`, `get routes`, `get resolvers`, `get machineconfig -o yaml`, `get machinestatus`, `validate --config --mode metal`, `memory`, and `dmesg`.
- `talosctl get hostname` works as an alias for `HostnameStatus` (per Talos docs, status resources support an alias without the `Status` suffix). The canonical name is `hostnamestatus`; both forms are accepted.
- For real-world cluster health checks, readers often need `--endpoints` plus `--control-plane-nodes`/`--worker-nodes` flags in addition to `--nodes`. Not incorrect as written, but slightly incomplete; left unchanged because the post intentionally targets single-node investigation.
- The bootstrap-once semantics, etcd disk latency guidance, kube-apiserver default port (6443), and VIP single-holder behavior all match the Talos documentation.

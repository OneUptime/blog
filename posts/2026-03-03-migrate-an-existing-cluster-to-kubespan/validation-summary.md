# Validation Summary: How to Migrate an Existing Cluster to KubeSpan

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Talos Linux
- KubeSpan (built-in WireGuard mesh networking)
- WireGuard
- Kubernetes (kubectl)
- etcd
- talosctl CLI

## Sources Consulted
- [Talos KubeSpan documentation (v1.11)](https://docs.siderolabs.com/talos/v1.11/networking/kubespan)
- [Talos Discovery Service documentation (v1.12)](https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/discovery)
- [Talos Configuration Patches documentation (v1.9)](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching)
- [Talos etcd Maintenance documentation](https://www.talos.dev/v1.7/advanced/etcd-maintenance/)
- [Talos releases](https://github.com/siderolabs/talos/releases)

## Issues Found
No technical issues found. Verified the following against official documentation:
- `machine.network.kubespan` configuration block with `enabled`, `advertiseKubernetesNetworks`, and `mtu` fields — all field names are correct.
- Default WireGuard MTU of 1420 (1500 - 80 byte overhead) — accurate.
- The MTU = UnderlyingMTU - 80 formula matches official guidance; 1380 is appropriate for GCP-style 1460 MTU environments.
- `cluster.discovery.enabled: true` config path — correct.
- `talosctl patch machineconfig --patch @file.yaml --nodes <ip>` syntax and `@file` reference — correct.
- `talosctl get kubespanidentity` / `kubespanpeerstatus` resource names — both singular and plural forms are accepted by talosctl.
- `talosctl get links` for inspecting KubeSpan link — valid.
- `talosctl etcd members` and `talosctl etcd status` commands — correct.
- Statement that KubeSpan requires the discovery service and that discovery is enabled by default — correct.
- Statement that KubeSpan nodes can still communicate with non-KubeSpan nodes via regular networking during incremental migration — correct (non-KubeSpan nodes are simply not added as WireGuard peers).
- kubectl commands (`kubectl run` with `--overrides` for nodeName, `--field-selector`, `kubectl exec`) — syntactically correct.

## Review Notes
- The post states "KubeSpan requires Talos 1.0+". KubeSpan was actually introduced in Talos 0.13 (and reached general usability around the 1.0 stable release). The 1.0+ recommendation is a sensible practical baseline and not technically wrong.
- Talos 1.13 introduced a new `KubeSpanConfig` document that will eventually replace the `machine.network.kubespan` field. The configuration approach in this post still works on all current versions (1.0 through at least 1.13), but readers on Talos 1.13+ may want to migrate to the new document format in the future.
- Cloud-specific MTU guidance (1380) maps well to GCP (1460 underlying MTU). For other clouds with different underlying MTUs (e.g., AWS jumbo frames at 9001, Azure at 1500), users should compute KubeSpanMTU = UnderlyingMTU - 80 themselves.
- The post does not mention `allowDownPeerBypass`, which is another KubeSpan field that can affect failure behavior, but it is reasonably out of scope for a migration guide.

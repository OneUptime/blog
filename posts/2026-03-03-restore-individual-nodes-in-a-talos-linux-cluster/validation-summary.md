# Validation Summary: How to Restore Individual Nodes in a Talos Linux Cluster

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Talos Linux (v1.9.x)
- talosctl CLI
- Kubernetes (kubectl)
- etcd
- Talos Image Factory
- Velero (for PV restore)
- Bash scripting

## Sources Consulted
- Talos Linux v1.9 CLI reference: https://www.talos.dev/v1.9/reference/cli/ (redirects to https://docs.siderolabs.com/talos/v1.9/reference/cli/)
- Talos Linux v1alpha1 configuration reference: https://www.talos.dev/v1.9/reference/configuration/v1alpha1/config/
- Talos Image Factory API: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Talos Linux v1.9.0 release: https://github.com/siderolabs/talos/releases/tag/v1.9.0 (released 2024-12-17)
- Talos lifecycle / resetting a machine docs (apply-config, reset --graceful)
- Kubernetes changelog v1.19 (deprecation of componentstatuses): https://kubernetes.io/

## Issues Found
1. **Incorrect etcd subcommand (4 occurrences):** The post used `talosctl etcd member list`, which is not a valid talosctl subcommand. The correct command is `talosctl etcd members` (plural, single token). Verified directly against the Talos v1.9 CLI reference, which lists `talosctl etcd members` as "Get the list of etcd cluster members". Replaced all four occurrences.

2. **Use of deprecated `kubectl get cs` (2 occurrences):** `componentstatuses` was deprecated in Kubernetes 1.19 (August 2020) and is no longer a reliable API-responsiveness check on modern clusters. Replaced both occurrences with `kubectl get --raw='/readyz?verbose'`, which is the currently recommended API-server health probe.

## Review Notes
- All other talosctl commands and flags were verified as correct against the Talos v1.9 CLI reference: `talosctl health`, `talosctl version`, `talosctl logs controller-runtime`, `talosctl logs etcd`, `talosctl dmesg`, `talosctl apply-config --insecure --nodes --file`, `talosctl etcd status`, `talosctl etcd remove-member <hex-id>`, and `talosctl reset --graceful=false`.
- The Talos Image Factory URL format (`https://factory.talos.dev/image/<schematic>/<version>/<platform>-<arch>.raw.xz`) and the cited v1.9.0 version are correct and current.
- The machine config YAML fields used (`machine.network.hostname`, `interfaces[].interface`, `interfaces[].addresses`, `routes[].network`, `routes[].gateway`) match the v1alpha1 schema. `deviceSelector` exists as an alternative selector but `interface` is still a supported, non-deprecated field in v1.9.
- The `talosctl -n <ip> health` command works as written but is primarily a cluster-level check; passing only `-n <ip>` checks reachability from that one node's perspective rather than running the full cluster health probe. The post's usage is acceptable as a quick reachability test.
- The post correctly notes that with a 3-node control plane, losing one node still leaves etcd quorum (2/3) — this matches Raft consensus requirements.

## Final Status
After the fixes above, the post is technically accurate and safe to follow for Talos Linux v1.9.x clusters.

# Validation Summary: How to Check Current Talos Linux Version on Nodes

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (v1.7 referenced in examples)
- talosctl CLI (version, get, dmesg, logs subcommands)
- Kubernetes (kubectl, node objects, kubelet)
- COSI resource API exposed by Talos (MachineStatus, MetaKey, MachineConfig)
- Prometheus / kube-state-metrics (kube_node_info)
- Bash scripting

## Sources Consulted
- Talos `version` command source for v1.7.0: https://github.com/siderolabs/talos/blob/v1.7.0/cmd/talosctl/cmd/talos/version.go (confirmed flags: `--short`, `--client`, `--insecure`/`-i`, and hidden `--json`; `-o`/`--output` is NOT supported on `version`)
- Talos `MachineStatus` resource source: https://github.com/siderolabs/talos/blob/v1.7.0/pkg/machinery/resources/runtime/machine_status.go (confirmed the resource only carries `stage` and `status.ready`/`unmetConditions` — no version field)
- Talos `MetaKey` resource source: https://github.com/siderolabs/talos/blob/v1.7.0/pkg/machinery/resources/runtime/meta_key.go (confirmed alias `meta` for `talosctl get meta`)
- Talos resources directory: https://github.com/siderolabs/talos/tree/v1.7.0/pkg/machinery/resources
- Siderolabs Talos CLI docs (redirected): https://docs.siderolabs.com/talos/v1.7/reference/cli/

## Issues Found
1. **`talosctl version -o json` is not a valid flag** — `talosctl version` does not accept `-o`/`--output`. The actual flag for JSON output is `--json` (hidden, undocumented per the in-source TODO referencing issue siderolabs/talos#907). Fixed the example to use `--json`.
2. **`talosctl get machinestatus` does not return a Talos version** — the `MachineStatus` COSI resource only exposes `stage` and `status` (`ready`, `unmetConditions`); it has no version field. Rewrote the surrounding paragraph to (a) make `talosctl version` the canonical source of the version string and (b) describe `machinestatus` accurately as runtime stage/readiness. Also clarified that `talosctl get meta` lists META partition keys (upgrade/runtime metadata) rather than "the installed version".
3. **Misleading Kubernetes node-labels section** — the post claimed Talos sets labels on Kubernetes nodes that include version information, with an example using `node.kubernetes.io/instance-type` (a standard cloud-instance-type label that has nothing to do with Talos versions). Talos does not auto-attach a version label; it does support user-defined labels/annotations via `machine.nodeLabels` and `machine.nodeAnnotations`. Rewrote the section to describe the actual behaviour and redirect readers to the `kubectl get nodes -o wide` `OS-IMAGE` field for the reliable Kubernetes-side view.

## Review Notes
- The `--short` flag on `talosctl version` only short-formats the *client* block; the server block still prints in the long format (containing `Tag:`). The inventory and mismatch-detection scripts therefore still work as written because `grep "Tag:" | tail -1` correctly captures the server tag.
- All examples reference Talos v1.7.0 and Kubernetes v1.30. Both were valid stable releases in 2024; the techniques described continue to apply to current Talos releases, though the exact Tag/SHA/Built strings in sample output are illustrative only.
- The `kube_node_info` PromQL example is a standard kube-state-metrics metric and is correct, though it surfaces the kubelet (Kubernetes) version, not the Talos version, as the post acknowledges.
- The post's `talosctl get machineconfig ... | grep -A 3 "install:"` example works for typical machine configs but depends on YAML indentation; structured queries (`-o jsonpath` or `yq`) would be more robust for production scripts.

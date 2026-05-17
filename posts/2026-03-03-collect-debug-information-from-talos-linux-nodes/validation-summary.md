# Validation Summary: How to Collect Debug Information from Talos Linux Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (`talosctl` CLI)
- Kubernetes (`kubectl`)
- etcd (`etcdctl`)
- Bash scripting

## Sources Consulted
- Talos v1.10 CLI reference: https://docs.siderolabs.com/talos/v1.10/reference/cli/
- Talos v1.9 CLI reference: https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos v1.8 CLI reference: https://docs.siderolabs.com/talos/v1.8/reference/cli/
- `talosctl support` reference: https://docs.siderolabs.com/talos/v1.10/reference/cli/talosctl_support/
- Talos Networking Resources: https://docs.siderolabs.com/talos/v1.10/learn-more/networking-resources/
- Talos v1.9 "What's New" (notes the removal of `talosctl disks`): https://docs.siderolabs.com/talos/v1.9/getting-started/what's-new-in-talos
- siderolabs/talos issue #10001 (deprecation of `talosctl disks`)

## Issues Found
- **`talosctl disks` is no longer a top-level subcommand.** It was removed in Talos v1.9 in favor of the resource-based API. Replaced two occurrences (the "Collecting Disk and Storage Information" section and the automated debug script) with `talosctl get disks`, which is the form recommended in the v1.9 release notes.
- **`talosctl cpuinfo` is not a valid subcommand** in any documented Talos version (1.7–1.10). CPU information is exposed through the resource API. Replaced the call in the "Collecting Process and Memory Information" section with `talosctl get cpu`.

## Review Notes
- All other commands and flags verified against the v1.10 CLI reference: `talosctl support --output`, `talosctl logs --tail/--follow`, `talosctl services`, `talosctl dmesg`, `talosctl get links/addresses/routes/resolvers/neighbors/timeserverstatus/machineconfiguration`, `talosctl pcap --interface --duration`, `talosctl usage`, `talosctl processes`, `talosctl memory`, `talosctl etcd members/status`, `talosctl health`, `talosctl time`, and `talosctl version --client` are all correct.
- The `etcdctl` examples use the standard v3 API flags (`--endpoints`, `--cacert`, `--cert`, `--key`, `endpoint status`, `alarm list`) and are accurate.
- The `kubectl` examples (`get nodes -o wide`, `get pods -A -o wide`, `get events --sort-by`, label-selector based log collection) are standard and correct.
- Minor caveat (not corrected — still correct usage): the `talosctl pcap` example labeled "Capture with a filter (if supported)" doesn't actually apply any BPF filter — `talosctl pcap` does support a `--bpf-filter` flag, but the example as written merely captures all traffic for a shorter duration. This is technically correct (just not a filtered capture) so no change was made.
- The flannel label selector (`app=flannel`) is correct for the upstream flannel daemonset; deployments that use Cilium or Calico would need different selectors, but that's standard knowledge for the reader.

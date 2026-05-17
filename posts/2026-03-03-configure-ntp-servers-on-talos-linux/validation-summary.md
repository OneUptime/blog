# Validation Summary: How to Configure NTP Servers on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (machine configuration, `machine.time` section)
- `talosctl` CLI (gen config, patch, get, logs, time subcommands)
- NTP (Network Time Protocol)
- Cloud provider NTP endpoints (AWS, Azure, GCP)
- JSON Patch (used by `talosctl patch machineconfig`)

## Sources Consulted
- [Talos Linux Time Synchronization guide (v1.10)](https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/system-configuration/time-sync)
- [Talos Linux Time Synchronization guide (v1.9)](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/time-sync)
- [Talos v1.12 TimeSyncConfig / Time Servers reference](https://docs.siderolabs.com/talos/v1.12/networking/configuration/time)
- siderolabs/talos GitHub source — `cmd/talosctl/cmd/talos/` (confirmed `time.go` exists, so `talosctl time` is valid)
- siderolabs/talos GitHub source — `internal/app/` (confirmed list of services: apid, auditd, dashboard, debug, images, init, internal, lifecycle, machined, poweroff, resources, storaged, syslogd, trustd — **no `timed` service**)
- siderolabs/talos GitHub source — `pkg/machinery/resources/network/timeserver_status.go` (aliases: `timeserver`, `timeservers`)
- siderolabs/talos GitHub source — `pkg/machinery/resources/network/timeserver_spec.go` (no `timeserverconfig` alias)

## Issues Found

1. **`talosctl get timeserverconfig` is not a valid resource.** The post used this command in three places. The correct resource alias for the active NTP servers Talos is using is `timeservers` (resource type `TimeServerStatuses.net.talos.dev`). Replaced both observed occurrences with `talosctl get timeservers -o yaml`.

2. **`talosctl service timed` and `talosctl logs timed` do not work — there is no `timed` service in Talos Linux.** Time synchronization is integrated into the controller runtime via the `time.SyncController`, not exposed as a separate `services` entry. Replaced the failure-diagnosis snippet with `talosctl logs controller-runtime | grep -i time.Sync` plus `get timeservers` / `get timestatus`, which is the approach documented by Sidero Labs.

3. **Default-NTP-server claim was inaccurate.** The post stated "the default configuration points to well-known public NTP pools." Per Sidero Labs' documentation, the default is a single server, `time.cloudflare.com`. Updated the wording accordingly so the rest of the paragraph (about latency / firewalls / compliance) still flows naturally.

## Review Notes

- `talosctl time` (with optional `--check <server>`) is valid — confirmed by the presence of `time.go` in the talosctl command source and the official CLI reference. The post's use of it for cross-node comparison is correct.
- The `machine.time` schema fields used in the post (`disabled`, `servers`) are correct. The post does not mention `bootTimeout`, which also exists and would be worth covering in a follow-up but is not required for correctness.
- The cloud-provider NTP endpoints listed (AWS `169.254.169.123`, Azure `time.windows.com`, GCP `metadata.google.internal`) all match the providers' published recommendations.
- The JSON Patch syntax used with `talosctl patch machineconfig -p '[...]'` is correct, and the path `/machine/time` is the right pointer for replacing this section.
- The claim that NTP changes apply live without a reboot is accurate for the `machine.time` section in current Talos versions (it is not in the list of restart-required fields).
- The diagnostic guidance (UDP/123, DNS resolution, redundant servers) is generic NTP knowledge and is accurate.

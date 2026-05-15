# Validation Summary: How to Use talosctl time to Check and Sync Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Time synchronization
- NTP / SNTP
- Kubernetes cluster administration

## Sources Consulted
- Sidero Talos CLI reference for `talosctl time`, `talosctl service`, `talosctl logs`, and related flags: https://docs.siderolabs.com/talos/latest/reference/cli
- Sidero Talos Time Synchronization guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/time-sync
- Sidero Talos Time Servers guide: https://docs.siderolabs.com/talos/v1.12/networking/configuration/time
- Sidero Talos `TimeSyncConfig` reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/timesyncconfig
- Sidero Talos Editing Machine Configuration guide: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/system-configuration/editing-machine-configuration

## Issues Found
- The post described `talosctl time` as showing NTP synchronization status and an `NTP-OFFSET` column. Official CLI docs describe `talosctl time` as getting current server time, with `--check` used to compare against an NTP server. Updated the output examples and explanation to use `NODE-TIME`, `NTP-SERVER`, and `NTP-SERVER-TIME`.
- The post said Talos defaults to `pool.ntp.org`. Current Talos documentation states the default NTP server is `time.cloudflare.com`. Updated the text and examples.
- The post used older `machine.time` configuration snippets. Current Talos documentation recommends `TimeSyncConfig` for time server configuration. Updated custom and air-gapped NTP examples to use `apiVersion: v1alpha1`, `kind: TimeSyncConfig`, and `ntp.servers`.
- The scripting example attempted to parse a non-existent offset value from `talosctl time`. Updated it to use `talosctl time --check` for time comparison and `talosctl get timestatus` for sync status.
- Troubleshooting commands used `dmesg` and `machineconfig` greps for time sync details. Official Talos docs recommend `talosctl get timestatus`, `talosctl get timeservers`, `talosctl get timeserverspec --namespace=network-config`, and `talosctl logs controller-runtime | grep -i time.Sync`. Updated the commands accordingly.
- The health check example used `talosctl services`, but current Talos CLI uses `talosctl service`. Updated the command.

## Review Notes
The remaining operational guidance is broadly correct. For future improvement, the post could mention that Talos v1.12 introduced multi-document network configuration and that older clusters may still have examples using `machine.time`.

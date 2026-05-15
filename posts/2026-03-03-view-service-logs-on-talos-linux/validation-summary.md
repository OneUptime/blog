# Validation Summary: How to View Service Logs on Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes control plane components
- containerd
- etcd
- Talos machine logging destinations

## Sources Consulted
- Sidero Labs Talos CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Sidero Labs Talos logging documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/logging-and-telemetry/logging
- Sidero Labs Talos troubleshooting documentation: https://docs.siderolabs.com/talos/v1.11/introduction/troubleshooting/
- Sidero Labs Talos network connectivity documentation: https://docs.siderolabs.com/talos/v1.9/learn-more/talos-network-connectivity
- Sidero Labs Talos system volumes documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management/system

## Issues Found
- The post claimed `talosctl logs` shows only the most recent logs by default. Current Talos CLI documentation says `--tail` defaults to `-1`, meaning the default is to show from the beginning. Updated the wording to explain the default and recommend `--tail` for recent lines.
- The post used unsupported `talosctl logs --since` examples. Current official CLI documentation lists `--follow`, `--kubernetes`, and `--tail`, but not `--since`. Replaced the time-filtering section and later workflow examples with `--tail`.
- The post showed Kubernetes control plane component logs as plain Talos service logs. Official examples use `talosctl logs -k` for Kubernetes containers, with container names discovered via `talosctl containers -k`. Updated those examples to use `-k` and explicit container placeholders.
- The centralized logging example implied that a generic Fluent Bit DaemonSet was the Talos service-log configuration. Talos supports machine logging destinations for service logs over TCP/UDP in `json_lines` format. Replaced the snippet with an accurate Talos machine logging destination example.
- The retention section said Talos keeps logs only in memory and has no persistent log storage. Current Talos documentation says logs are written under `/var/log`, and the EPHEMERAL volume stores logs. Updated the retention text accordingly.

## Review Notes
The post is now technically accurate for current Talos CLI behavior. Future improvements could include a separate example for collecting Kubernetes pod logs from `/var/log` with Fluent Bit, but that would be additional coverage rather than a correctness fix.

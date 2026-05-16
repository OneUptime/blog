# Validation Summary: How to Troubleshoot Clock Skew Issues on Talos Linux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- Time synchronization / NTP / SNTP
- Kubernetes
- etcd
- X.509 certificates

## Sources Consulted
- Talos Linux v1.13 Time Synchronization documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/system-configuration/time-sync
- Talos Linux v1.13 TimeSyncConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/timesyncconfig
- Talos Linux v1.13 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Linux v1.12 Configuration Patches documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- etcd Tuning documentation: https://etcd.io/docs/v3.4/tuning/
- Kubernetes Leases documentation: https://kubernetes.io/docs/concepts/architecture/leases/
- Kubernetes PKI certificates and requirements: https://kubernetes.io/docs/setup/best-practices/certificates/

## Issues Found
- The post referred to the old `timed` service and `talosctl logs timed`. Current Talos time synchronization is handled by the time sync controller, and official docs show `talosctl logs controller-runtime | grep -i time.Sync`. Updated the section heading, commands, and example log component names.
- The post used `talosctl get timeserverconfig`, but current Talos documentation uses the `timeservers` resource. Updated the command to `talosctl get timeservers -o yaml`.
- The post used `nc -zvu` as the NTP connectivity test. UDP netcat checks can be misleading and Talos provides `talosctl time --check <server>` for checking node time against an NTP server. Replaced the command.
- The NTP configuration examples patched deprecated/old `.machine.time` fields with JSON Patch paths such as `/machine/time/servers` and `/machine/time/disabled`. Current Talos documentation uses `TimeSyncConfig`. Updated the examples to patch `TimeSyncConfig` with `ntp.servers` and `enabled: true`.
- The post said etcd uses time-based leases for leader election. etcd Raft leader election uses heartbeat intervals and election timeouts, not wall-clock lease expiry. Updated the explanation and the later etcd impact section to distinguish clock/certificate/startup problems from heartbeat/election timeout behavior.
- The Kubernetes scheduling symptom explanation was too broad. Updated it to connect scheduling impact to kubelet certificate/authentication and node heartbeat problems, and noted Kubernetes Lease-based heartbeats.
- The post said "Three or more servers allow the NTP algorithm to detect and discard a faulty time source." Talos implements SNTP, and the official docs do not support that exact claim. Reworded the recommendation to focus on fallback and avoiding dependence on a single time source.

## Review Notes
The guide is now aligned with current Talos v1.13 time synchronization docs. Some operational symptoms, such as scheduling or workload-specific effects, are environment-dependent, but the article now avoids the main incorrect causal claims and outdated Talos commands.

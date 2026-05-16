# Validation Summary: How to Troubleshoot Talos Linux Time Sync Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Talos Linux
- Talos machine configuration
- NTP and SNTP time synchronization
- Kubernetes
- etcd
- TLS / X.509 certificate validity
- Cloud provider time sources for AWS, Google Cloud, and Azure

## Sources Consulted
- Talos Linux time synchronization documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/system-configuration/time-sync
- Talos Linux TimeSyncConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/timesyncconfig
- Talos Linux machine configuration editing documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes service account documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- etcd tuning documentation: https://etcd.io/docs/v3.4/tuning/
- RFC 5280 X.509 certificate validity: https://www.ietf.org/rfc/rfc5280.html
- AWS Time Sync Service documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-ec2-ntp.html
- Google Cloud NTP documentation: https://cloud.google.com/compute/docs/instances/time-synchronization/configure-ntp
- Azure VM time synchronization documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/time-sync

## Issues Found
- The post said Talos uses `chronyd` or built-in time synchronization. Current Talos documentation says Talos implements SNTP with its own time synchronization controller, so the implementation description was corrected.
- The post used `talosctl get timeserverstatus`. Current Talos documentation uses `talosctl get timestatus` for sync status and `talosctl get timeservers` for server status, so the commands were corrected.
- The post used `talosctl get machineconfiguration` to inspect time configuration. Current documentation references `machineconfig` and the current time server resources, so the inspection commands now use `timeservers` and `timeserverspec`.
- The NTP reachability example used a BusyBox `kubectl run` command with UDP `nc`, which is not a reliable NTP validation and omitted `--command` for a custom command. It was replaced with `talosctl time --check`, which is the Talos-native NTP check.
- The machine configuration snippets used the older `machine.time` shape. Current Talos documentation uses `TimeSyncConfig` documents for NTP/PTP time sync configuration, so all NTP and `bootTimeout` snippets were updated.
- The patch example targeted `/machine/time` with JSON Patch. It now uses a `TimeSyncConfig` patch file with `talosctl patch machineconfig -p @timesync.yaml`, matching the current Talos patch workflow.
- The etcd explanation implied time-based ordering. etcd ordering is not based on wall-clock time, so the text was narrowed to leases, heartbeats, election timeouts, and clock/timer disruption.
- The post said more than a minute of skew will almost certainly break TLS and token validation. That was too broad because TLS and token failures depend on validity windows, so the statement now refers to clocks outside certificate or token validity periods.
- The local NTP server section implied an NTP pod inside the same Talos cluster is sufficient for boot-time recovery. The text now notes that air-gapped NTP should be outside the Talos cluster or otherwise available before Talos nodes boot.

## Review Notes
`talosctl` was not installed in the local environment, so CLI validation was performed against the official Talos CLI and configuration documentation rather than local `--help` output.

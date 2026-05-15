# Validation Summary: How to Verify Time Synchronization Status on Talos Nodes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- talosctl
- Time synchronization with SNTP/NTP
- Kubernetes node monitoring
- Prometheus and node_exporter metrics
- Bash scripting

## Sources Consulted
- Sidero Labs Talos Time Synchronization documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/time-sync
- Sidero Labs Talos CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Sidero Labs Talos Time Servers documentation: https://siderolabs-fe86397c.mintlify.app/talos/v1.12/networking/configuration/time
- Sidero Labs Talos Logging documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/logging-and-telemetry/logging
- Talos time resource package documentation: https://pkg.go.dev/github.com/siderolabs/talos/pkg/machinery/resources/time
- Talos network resource package documentation: https://pkg.go.dev/github.com/siderolabs/talos/pkg/machinery/resources/network
- Prometheus node_exporter documentation: https://github.com/prometheus/node_exporter

## Issues Found
- The post used `talosctl get timeserverconfig`, but current Talos documentation shows the effective time server status resource as `timeservers`. Updated all examples and checklist commands to use `talosctl get timeservers`.
- The post referred to a `timed` service log stream and showed `talosctl logs timed`, but current Talos documentation says detailed time sync logs are available in `controller-runtime` and can be filtered for `time.SyncController`. Updated the log commands and examples accordingly.
- The post used `talosctl service timed` as a post-upgrade check, but current Talos time synchronization is handled by the controller runtime rather than a `timed` service. Replaced this check with `talosctl services`.
- The post claimed to cover every available method for checking time sync status. Changed this to "several practical methods" to avoid an overbroad claim.

## Review Notes
The Prometheus examples use node_exporter `timex` metrics, which are valid node_exporter metrics, but they depend on deploying node_exporter with host access suitable for Talos nodes. The local workspace did not have `talosctl` installed, so CLI verification was performed against official Talos documentation rather than local `--help` output.

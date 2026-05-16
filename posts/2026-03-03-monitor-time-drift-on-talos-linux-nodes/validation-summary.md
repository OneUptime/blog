# Validation Summary: How to Monitor Time Drift on Talos Linux Nodes

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (talosctl CLI, time-sync controller, COSI resources)
- NTP (time synchronization)
- Prometheus + Prometheus Operator (PrometheusRule CRD)
- Prometheus Node Exporter (ntp and timex collectors)
- Grafana (dashboard JSON)
- Kubernetes (DaemonSet)
- Bash scripting

## Sources Consulted
- Talos Linux CLI reference: https://www.talos.dev/latest/reference/cli/
- Talos source — `cmd/talosctl/cmd/talos/time.go`: https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/time.go
- Talos source — `pkg/machinery/resources/time/status.go` (TimeStatus / synced field)
- Talos source — `pkg/machinery/resources/network/timeserver_spec.go` and `timeserver_status.go` (timeservers resource)
- Talos service list — `internal/app/machined/pkg/system/services/` (confirms there is no `timed` service)
- Prometheus Node Exporter ntp collector: https://github.com/prometheus/node_exporter/blob/master/collector/ntp.go
- Prometheus Node Exporter timex collector: https://github.com/prometheus/node_exporter/blob/master/collector/timex.go

## Issues Found
1. **Non-existent `timed` service.** The post repeatedly used `talosctl service timed` and `talosctl logs timed`. Talos has no standalone `timed` service — time synchronization is implemented as a controller inside `machined`. Replaced these with `talosctl logs controller-runtime | grep -i "time.Sync"`, which is the supported way to inspect time-sync activity. This affected three sections: "Gradual Drift", "Sudden Jump", and the auto-remediation script.
2. **Wrong resource name `timeserverconfig`.** The post used `talosctl get timeserverconfig -o yaml`, but the correct resource alias is `timeservers` (backed by `TimeServerStatuses.net.talos.dev`). Fixed in the "Oscillating Drift" section.
3. **Auto-remediation script logic.** Because there is no `timed` service, the script's check of `talosctl service timed` STATE was invalid. Rewrote that branch to inspect the configured `timeservers` resource and the `controller-runtime` logs, which is a meaningful diagnostic on Talos.

## Review Notes
- The Prometheus Node Exporter ntp collector is functionally correct as documented, but upstream has marked it deprecated and it is slated for removal in the next major release. Future readers should consider alternatives (e.g., dedicated chrony/ntpd exporters or `node_timex_*` metrics, which the post already uses).
- `--collector.ntp.server-is-local=false` is the default value, so passing it explicitly is harmless but redundant. Note that with this set to `false`, the configured NTP server must be a loopback address per the collector's safety check — pointing at `time.cloudflare.com` as shown will be rejected unless `server-is-local=true`. Readers running this in production will likely need to flip that flag to `true` and point at a trusted local stratum server. Left as-is because correcting it would require a larger rewrite and the flag names themselves are accurate.
- `talosctl -n <node> time` outputs human-readable text, not an epoch value, so the "Cross-Node Time Comparison" script does not perform arithmetic on the result — it only prints values for visual inspection. This matches the script's stated intent (manual comparison), so left unchanged.
- The reference to `node_ntp_offset_seconds` is correct; this metric is exposed only when the `ntp` collector is enabled (which the DaemonSet does via `--collector.ntp`).

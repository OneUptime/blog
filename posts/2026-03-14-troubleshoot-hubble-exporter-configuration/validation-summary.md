# Validation Summary: How to Troubleshoot Cilium Hubble Exporter Configuration

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Cilium
- Hubble
- Hubble Exporter
- Kubernetes
- Helm
- kubectl
- Prometheus metrics
- Python JSON parsing

## Sources Consulted
- Cilium Hubble exporter configuration documentation: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium Helm values reference for Hubble exporter and Hubble metrics settings: https://docs.cilium.io/en/stable/helm-values/
- Cilium Hubble metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble observability overview and CLI access notes: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium Flow API lost event source documentation: https://docs.cilium.io/en/stable/_api/v1/flow/README/#losteventsource
- Cilium source for Hubble metrics names: https://github.com/cilium/cilium/blob/main/pkg/hubble/metrics/metrics.go
- Cilium source for dynamic exporter metrics names: https://github.com/cilium/cilium/blob/main/pkg/hubble/exporter/metrics.go

## Issues Found
- The prerequisites mentioned the Cilium CLI but omitted the Hubble CLI, even though several commands use `hubble observe`. Added the Hubble CLI prerequisite.
- The first status command used `cilium status` inside the Cilium agent pod. Current Cilium pod tooling documents `cilium-dbg status`, so the command was updated to use `cilium-dbg`.
- The data-loss section used port `9962` and metric names matching `hubble_export` / `hubble_export_events_lost`. Hubble metrics use the `hubble_` namespace and default to port `9965`; the lost-events metric is `hubble_lost_events_total`, and dynamic exporter metrics use `hubble_dynamic_exporter_*`. Updated the commands accordingly.
- The data-loss comparison counted all exported lines in the file against `hubble observe --last 1000`, which is not a like-for-like comparison. Changed it to compare against the latest 1000 exported lines and noted that it is only a rough comparison when no filters are applied.
- The verification command piped multiple newline-delimited JSON records into `python3 -m json.tool`, which expects one JSON document and can fail on valid JSONL output. Replaced it with a line-by-line `json.loads` check.
- The troubleshooting guidance recommended deleting the active export file. A running process can keep writing to an unlinked file, so the fix was changed to truncate the file in place.

## Review Notes
The post now aligns with current Cilium stable documentation for Hubble exporter Helm values, filter behavior, file rotation settings, Hubble metrics port, and exported metric names. The guide remains version-agnostic, but readers on older Cilium releases should still check their minor-version documentation for any exporter or Helm chart differences.

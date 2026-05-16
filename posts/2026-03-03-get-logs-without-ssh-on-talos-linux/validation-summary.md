# Validation Summary: How to Get Logs Without SSH on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl (CLI)
- Kubernetes / kubectl
- containerd
- Fluentd (DaemonSet for log shipping)
- Promtail / Grafana Loki
- Elasticsearch
- syslog / Logstash (as remote log endpoints)

## Sources Consulted
- [Talos v1.7 talosctl reference](https://docs.siderolabs.com/talos/v1.7/reference/cli/)
- [Talos v1.10 Logging guide](https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/logging-and-telemetry/logging)
- [Talos v1alpha1 config reference (machine.logging.destinations)](https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/)
- [siderolabs/talos source: cmd/talosctl/cmd/talos/logs.go](https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/logs.go)

## Issues Found
1. **"Filtering by Time" section was inaccurate.** The original text labeled `--tail` as a way to filter logs by time and showed the comment "Get logs from the last hour" next to `--tail 1000`. `talosctl logs` does not have a `--since`/time-window flag — the only supported flags are `--follow`/`-f`, `--tail`, `-k`/`--kubernetes`, and the hidden `--use-cri`. `--tail` selects a number of recent lines, not a duration. Renamed the section to "Limiting the Number of Log Lines" and corrected the misleading comment to "Show the last 1000 log lines".

2. **`format: syslog` is not a valid Talos logging destination format.** The post listed `syslog` as a supported value for `machine.logging.destinations[].format` and used it in a multi-destination example. Per the official Talos documentation, the only currently supported format is `json_lines`. Removed `syslog` from the supported-formats description, replaced it with a clarification that only `json_lines` is supported (and noted the supported `tcp`/`udp` endpoint protocols), and changed the second destination in the multi-destination YAML to `format: json_lines`.

## Review Notes
- All other talosctl commands referenced are correct: `talosctl logs <service>`, `talosctl dmesg [--follow]`, `talosctl containers -k`, `talosctl logs -k <container-id>`, `talosctl services`, `talosctl get events`.
- The kubectl examples (`-l component=kube-apiserver`, `--previous`, `-c <container>`, `--follow`) are all standard, correct kubectl usage and apply unchanged to Talos clusters where control-plane components run as static pods labeled with `component=...`.
- The Fluentd and Promtail DaemonSet YAML manifests are minimal but syntactically valid `apps/v1` DaemonSets. They would need additional configuration (Fluentd configmap, Promtail scrape config) in a real deployment, but as illustrative snippets they are accurate.
- A future revision could note that on Talos the host `/var/log/containers` symlinks resolve into `/var/log/pods`, so a production-ready Promtail/Fluentd DaemonSet typically needs both paths mounted plus `/var/log/pods`. This is beyond the scope of the post's "getting started" framing and was not changed.
- The post is written for current Talos (~v1.7+); no version is pinned. Both fixes apply across recent Talos versions (logging-format constraint and absence of `--since` are both still true as of v1.10).

# Validation Summary: How to Forward Talos Linux Logs to Splunk

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration logging destinations, talosctl)
- Splunk (HEC, SPL, REST API, indexes, sourcetypes, dashboards, alerts)
- Vector (socket source, remap/VRL transforms, splunk_hec_logs sink)
- Fluentd (tcp source, record_transformer filter, splunk_hec output plugin)
- Kubernetes (Deployment, Service, ConfigMap, Secret)
- Bash scripting

## Sources Consulted
- Vector splunk_hec_logs sink reference — https://vector.dev/docs/reference/configuration/sinks/splunk_hec_logs/
- Vector socket source reference — https://vector.dev/docs/reference/configuration/sources/socket/
- VRL (Vector Remap Language) expressions — https://vector.dev/docs/reference/vrl/expressions/
- Talos v1alpha1 machine config reference — https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Splunk HTTP Event Collector documentation — https://docs.splunk.com/Documentation/SplunkCloud/latest/Data/UsetheHTTPEventCollector
- fluent-plugin-splunk-hec GitHub repo — https://github.com/splunk/fluent-plugin-splunk-hec
- Splunk SPL timechart and stats references — https://docs.splunk.com/Documentation/SplunkCloud/latest/SearchReference/Timechart

## Issues Found
No technical issues found.

Verified specifically:
- Vector `splunk_hec_logs` sink fields (`default_token`, `endpoint`, `host_key`, `index`, `source`, `sourcetype`, `compression`, nested `tls.verify_certificate`) — all valid.
- Vector socket source with `mode = "tcp"` and `decoding.codec = "json"` — valid.
- VRL functions used (`del()`, `??` error coalescing, `now()`, `contains()`, `string!()`) — all valid.
- Talos `machine.logging.destinations` with `tcp://` endpoint and `format: json_lines` — matches official schema.
- `talosctl patch machineconfig` and `talosctl service kubelet restart` command syntax — both valid.
- Splunk port usage (8088 HEC ingest, 8089 management REST) and health endpoint `/services/collector/health` — correct.
- Splunk REST API path `servicesNS/admin/splunk_httpinput/data/inputs/http` for HEC token creation — correct.
- Fluentd `@type splunk_hec` output plugin keys (`hec_host`, `hec_port`, `hec_token`, `index`, `source`, `sourcetype`) — valid for splunk/fluent-plugin-splunk-hec.
- `timberio/vector:latest-alpine` Docker image — still the official Vector image on Docker Hub.
- SPL queries with `timechart`, `stats latest()`, `eval`, `where`, `top`, `table` — syntactically valid.

## Review Notes
- The `host_key = "host"` in the Vector splunk_hec_logs sink is the default value, so it is redundant but harmless.
- In the Fluentd config, setting `index` via `record_transformer` is redundant since the `splunk_hec` `<match>` block already sets `index talos`; this does not cause errors.
- Using `latest-alpine` for the Vector image works but pinning to a specific version (e.g., `0.40.0-alpine`) would be more reproducible for production.
- The trailing slash in the Talos endpoint (`tcp://...:5514/`) is accepted by Talos' URL parser but is stylistically unusual; both forms work.

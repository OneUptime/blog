# Validation Summary: How to Monitor KubeSpan Peer Status in Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (`talosctl`)
- KubeSpan (WireGuard-based cluster mesh)
- WireGuard
- Bash scripting (with `jq`)
- Python (`prometheus_client` library)
- Prometheus (PrometheusRule CRD from prometheus-operator)
- Grafana
- OneUptime heartbeat monitors

## Sources Consulted
- Talos Linux KubeSpan docs: https://www.talos.dev/v1.8/kubernetes-guides/network/kubespan/
- Talos KubeSpan resource definitions (protobuf): https://github.com/siderolabs/talos/blob/main/api/resource/definitions/kubespan/kubespan.proto
- Talos KubeSpan resource Go types: https://github.com/siderolabs/talos/tree/main/pkg/machinery/resources/kubespan
- `talosctl get` command reference: https://www.talos.dev/v1.8/reference/cli/#talosctl-get
- prometheus_client Python Enum metric docs: https://prometheus.github.io/client_python/instrumenting/enum/
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule

## Issues Found
1. **Example `talosctl get kubespanpeerstatus` table output was missing RX and TX columns.** The default columns for `KubeSpanPeerStatus` include `LABEL`, `ENDPOINT`, `STATE`, `RX`, and `TX` (after the standard `NODE`, `NAMESPACE`, `TYPE`, `ID`, `VERSION` columns). The post omitted `RX` and `TX`. Fixed by adding both columns with plausible byte counts to the example output table.

## Review Notes
- The singular resource names used by the post (`kubespanidentity`, `kubespanpeerstatus`, `kubespanpeerspec`, `kubespanendpoint`) are accepted as aliases for the canonical plural forms (`kubespanidentities`, `kubespanpeerstatuses`, `kubespanpeerspecs`, `kubespanendpoints`).
- JSON/YAML spec field names used in the scripts (`spec.label`, `spec.state`, `spec.endpoint`, `spec.receiveBytes`, `spec.transmitBytes`) match the camelCase JSON-tagged Go struct fields emitted by `talosctl -o json` / `-o yaml`. State values `up`, `down`, `unknown` are correct.
- The Prometheus query syntax `kubespan_peer_state{kubespan_peer_state="down"} == 1` is correct for `prometheus_client` `Enum` metrics, which emit one series per state with the metric name reused as a label name (documented behavior).
- The `--watch` flag for `talosctl get` is valid and streams resource updates.
- The Python `prometheus_client` API usage (`Enum`, `Gauge`, `labels()`, `.state()`, `.set()`, `start_http_server`) is correct.
- The PrometheusRule manifest (`apiVersion: monitoring.coreos.com/v1`, `kind: PrometheusRule`) is current and valid.
- Minor non-issue: the post does not surface additional `KubeSpanPeerStatus` spec fields like `lastUsedEndpoint` and `lastEndpointChange`. Not strictly required for the tutorial's scope.
- The `peer_rx_bytes` / `peer_tx_bytes` are exposed as `Gauge` even though they are monotonically increasing cumulative counters. A `Counter` would be more idiomatic, but using a `Gauge` for an externally-sourced counter is a known compromise when the source can reset/restart independently. Not technically wrong.

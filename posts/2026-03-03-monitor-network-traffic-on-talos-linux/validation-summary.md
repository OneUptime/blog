# Validation Summary: How to Monitor Network Traffic on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (`talosctl`)
- Kubernetes (`kubectl`, NetworkPolicy)
- Cilium CNI
- Hubble (CLI, Relay, UI)
- eBPF (referenced via Cilium/Hubble)
- Prometheus / PromQL
- node-exporter
- Prometheus Operator (PrometheusRule CRD)
- Helm
- tcpdump / Wireshark (pcap analysis)

## Sources Consulted
- Cilium Hubble metrics handler source: https://github.com/cilium/cilium/tree/main/pkg/hubble/metrics
- Cilium Hubble metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Setting up Hubble Observability: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Helm values: https://github.com/cilium/cilium/blob/main/install/kubernetes/cilium/values.yaml
- Talos Linux `talosctl` CLI reference (`pcap`, `get addresses`, `get routes`, `get links`, `get resolvers`, `netstat`): https://www.talos.dev/latest/reference/cli/
- Prometheus node-exporter network collector metric names
- Prometheus Operator PrometheusRule CRD reference

## Issues Found
1. **Invalid DNS latency PromQL query (fixed).** The original query was:
   ```
   histogram_quantile(0.99, rate(hubble_dns_response_types_total[5m]))
   ```
   This is incorrect because `hubble_dns_response_types_total` is a counter (`CounterVec`), not a histogram. It has no `le` label or `_bucket` series, so `histogram_quantile` cannot be applied to it. Hubble does not expose a native DNS latency histogram in the standard `dns` metric set (only `hubble_dns_queries_total`, `hubble_dns_responses_total`, and `hubble_dns_response_types_total` — all counters).

   Replaced with a meaningful aggregation of DNS response types:
   ```
   sum(rate(hubble_dns_response_types_total[5m])) by (type)
   ```
   Also dropped the non-existent `query` label from the DNS query rate aggregation (the standard labels are `rcode`, `qtypes`, and context labels).

## Review Notes
- The `helm upgrade` example overrides values with only the Hubble snippet. In practice users would typically add `--reuse-values` so they don't reset other Cilium settings. The blog presents these as illustrative values, so this was left as-is.
- Talos Linux's built-in default CNI is Flannel, not Cilium. The post hedges with "the default for many Talos deployments," which is a reasonable phrasing for production Talos installations that commonly swap to Cilium, so no change was made.
- The `curl --remote-name-all` flag is functionally fine but slightly redundant when downloading a single file — `-O` would suffice. Not a correctness issue.
- `talosctl pcap` flags (`--interface`, `--duration`, `--bpf-filter`, `-o`) are all valid per the current talosctl CLI reference.
- Hubble Relay service port `4245:80` mapping is correct (servicePort 80, targetPort 4245 with TLS disabled).
- All other Hubble metric names, labels, and label values (`hubble_drop_total{reason="POLICY_DENIED"}`, `hubble_tcp_flags_total{flag="SYN"}`, `hubble_http_requests_total{status=~"5.."}`, `hubble_http_request_duration_seconds_bucket`) were verified against the Cilium source code.

# Validation Summary: Monitoring Cilium Default Deny Ingress Policy Effectiveness

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes NetworkPolicy and CiliumNetworkPolicy
- Hubble
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium Hubble drop metric handler source: https://github.com/cilium/cilium/blob/main/pkg/hubble/metrics/drop/handler.go
- Cilium drop reason source: https://github.com/cilium/cilium/blob/main/pkg/monitor/api/drop.go
- Prometheus query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Hubble drop metric queries filtered `hubble_drop_total` with `reason="POLICY_DENIED"`, but Hubble uses the flow drop reason description as the metric label value. For policy drops this is the human-readable `Policy denied`. Updated both the example query and alert expression.
- The denied-to-allowed ratio divided raw `hubble_flows_processed_total` counters. Updated it to divide summed five-minute rates so the ratio reflects current traffic and handles counter resets correctly.
- The `PolicyNotEnforcing` alert used `cilium_endpoint_state{endpoint_state="ready"}`. Cilium documents the label as `state`, so the selector is now `cilium_endpoint_state{state="ready"}`.
- The `PolicyNotEnforcing` alert referenced `cilium_policy_count`, which is not the documented Cilium policy metric. Updated it to `cilium_policy`.

## Review Notes
- The Hubble CLI examples use documented filters such as `--verdict DROPPED`, namespace filtering, JSON output, and `--last`.
- The Hubble metrics configuration format and context options are consistent with current Cilium documentation.

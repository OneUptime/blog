# Validation Summary: Monitoring Cilium External Lock-Down Policy Effectiveness

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Prometheus
- Grafana
- Prometheus Operator PrometheusRule
- jq

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium/Hubble README and flow filter examples: https://github.com/cilium/hubble
- Cilium terminology for reserved identities: https://docs.cilium.io/en/latest/gettingstarted/terminology.html
- Cilium Layer 3 policy entities documentation: https://docs.cilium.io/en/stable/security/policy/layer3.html
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The prerequisites said Hubble must be enabled, but the PromQL examples require Hubble metrics to be enabled as well. I updated the prerequisite to say "Hubble and Hubble metrics enabled."
- The PromQL examples used `reason="POLICY_DENIED"` for `hubble_drop_total`. Hubble drop metrics expose the drop reason as a readable label such as `Policy denied`, so I changed the metric filters and alert expression to `reason="Policy denied"`.
- The first Hubble command attempted to identify external destinations by negating a Kubernetes namespace label. External endpoints are represented by Cilium's reserved `world` identity, so I changed the filter to `--to-label reserved:world`.
- The jq command treated missing destination labels as the signal for external traffic. Hubble/Cilium commonly represents outside-cluster endpoints with the `reserved:world` label, so I changed the jq filter to select destination labels containing `reserved:world`.

## Review Notes
- The Hubble metric names `hubble_drop_total` and `hubble_flows_processed_total` are documented Hubble metrics when the `drop` and `flow` metric groups are enabled.
- The PrometheusRule resource shape is valid for Prometheus Operator installations.
- The examples do not pin a Cilium version; this review used current stable Cilium documentation available on 2026-05-08.

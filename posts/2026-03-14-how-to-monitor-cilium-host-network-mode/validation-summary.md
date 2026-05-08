# Validation Summary: Monitoring Cilium Host Network Mode Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes host-networked pods
- Cilium host firewall and host policies
- Hubble CLI and Hubble metrics
- Prometheus and PrometheusRule
- Grafana

## Sources Consulted
- Cilium Host Firewall documentation: https://docs.cilium.io/en/stable/security/host-firewall/
- Cilium Host Policies documentation: https://docs.cilium.io/en/stable/security/policy/host.html
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium troubleshooting documentation for host-networked pods: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Hubble observe command source for filter flags and identity parsing: https://github.com/cilium/cilium/blob/main/hubble/cmd/observe/flows.go and https://github.com/cilium/cilium/blob/main/hubble/cmd/observe/identity.go

## Issues Found
- The Hubble examples used `--from-identity reserved:host` and `--to-identity reserved:host`. Cilium's Hubble identity filter parses reserved identity names such as `host`, while `reserved:host` is an endpoint label. I changed the commands to `--from-label reserved:host` and `--to-label reserved:host`, matching the documented host endpoint label.
- The Prometheus examples used `cilium_drop_count_total` and `cilium_forward_count_total` as host endpoint metrics. Those are Cilium agent datapath counters and do not identify host-network traffic by themselves. I changed the examples to Hubble metrics, `hubble_drop_total` and `hubble_flows_processed_total`, filtered by `source="reserved:host"`, and added the required Hubble metrics context prerequisite.
- The verification command used `cilium endpoint list`, but current Cilium documentation shows endpoint inspection through `cilium-dbg endpoint list` inside the Cilium agent. I updated the command to use `kubectl -n kube-system exec ds/cilium -- cilium-dbg endpoint list | grep reserved:host`.
- The troubleshooting note referred only to Cilium agent metrics. I updated it to check Hubble metrics with reserved identity context labels because the corrected examples depend on Hubble metrics.

## Review Notes
The Hubble metric queries require Hubble metrics to be enabled with reserved identity context labels; without that configuration, the metric names may exist but the `source="reserved:host"` filter will not match. The alert threshold remains example-specific and should be tuned per cluster.

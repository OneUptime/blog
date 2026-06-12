# Validation Summary: How to Configure Cilium Bandwidth Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cilium
- Cilium Bandwidth Manager
- eBPF
- EDT rate limiting
- BBR congestion control
- Hubble
- Prometheus
- Grafana
- OpenTelemetry Collector
- OneUptime

## Sources Consulted
- Cilium Bandwidth Manager documentation: https://docs.cilium.io/en/latest/network/kubernetes/bandwidth-manager/
- Cilium System Requirements documentation: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Hubble documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Kubernetes well-known labels and annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
- Corrected the bandwidth manager explanation to distinguish egress EDT rate limiting from ingress eBPF token bucket enforcement. Cilium documents EDT for egress bandwidth and a token bucket implementation for ingress.
- Replaced the outdated kernel guidance that said EDT requires Linux 5.1+ with current Cilium guidance: current Cilium releases recommend Linux 5.10+ or an equivalent distribution kernel, and BBR for Pods requires Linux 5.18+.
- Replaced `cilium bpf bandwidth list` with the documented `kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf bandwidth list` form for inspecting bandwidth settings from a Cilium agent pod.
- Corrected the namespace-level policy section. Cilium Network Policies do not enforce bandwidth limits; bandwidth limits require pod annotations or automation that applies those annotations.
- Replaced an invalid Hubble ConfigMap example with Helm settings documented by Cilium for enabling Hubble and Hubble metrics.
- Replaced inaccurate hand-written ServiceMonitor examples with Cilium Helm values that create ServiceMonitor resources through the chart.
- Corrected the PromQL example that described `hubble_flows_processed_total` as bytes. It counts flows, so the example now uses container network byte counters for throughput.
- Renamed the Grafana drop panel from "Bandwidth Limit Violations" to "Policy Drops" because bandwidth shaping is not represented as Hubble policy-denied drops.
- Updated the OpenTelemetry Collector Prometheus scrape config to use the Prometheus annotations and endpoints discovery pattern documented by Cilium, rather than selecting non-existent or unreliable pod labels.
- Completed Deployment examples that were missing required `spec.selector` fields and pod template labels/containers.

## Review Notes
Some examples remain intentionally illustrative. In particular, the Prometheus alerts compare traffic to a hard-coded 100 Mbps threshold; production setups should generate or template those thresholds from the actual pod annotations.

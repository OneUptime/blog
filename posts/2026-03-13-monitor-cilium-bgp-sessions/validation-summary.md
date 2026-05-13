# Validation Summary: Monitoring Cilium BGP Sessions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium BGP Control Plane
- Kubernetes
- Prometheus and Prometheus Operator
- Grafana
- Helm
- Cilium CLI

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane Operation Guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium BGP Control Plane Resources documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium Helm values / Helm reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI `cilium bgp peers` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_bgp_peers.html
- Cilium source for BGP metric names: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/pkg/bgp/metrics/metrics.go
- Cilium Go package constants for BGP metric subsystem and labels: https://pkg.go.dev/github.com/cilium/cilium@v1.19.3/pkg/bgp/types
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post used non-current or non-existent Cilium BGP metric names such as `cilium_bgp_announced_prefixes_total`, `cilium_bgp_received_prefixes_total`, `cilium_bgp_updates_total`, and `cilium_bgp_connect_retry_timer_expired_total`. Updated the examples to use the documented `cilium_bgp_control_plane_session_state`, `cilium_bgp_control_plane_advertised_routes`, `cilium_bgp_control_plane_received_routes`, `cilium_bgp_control_plane_reconcile_errors_total`, and `cilium_bgp_control_plane_reconcile_run_duration_seconds` metrics.
- The alerting example referenced `$labels.node` and `$labels.peer`, but Cilium's BGP Control Plane metric labels are `vrouter`, `neighbor`, and `neighbor_asn` with Kubernetes scrape labels such as `pod` added by Prometheus. Updated alert annotations to use `neighbor` and `vrouter`.
- The prefix-drop alert used `decrease(...)`, which is not a valid PromQL function, and treated route count gauges like counters. Updated the alert to use `delta(cilium_bgp_control_plane_advertised_routes[5m]) < 0`.
- The dashboard examples used invalid metric names and a non-existent connect-retry counter for flapping. Updated the examples to use current BGP Control Plane metrics and `changes(cilium_bgp_control_plane_session_state[10m])` for session state changes.
- The Helm example enabled metrics but did not enable the Cilium agent ServiceMonitor even though the guide assumes Prometheus Operator scraping. Added `prometheus.serviceMonitor.enabled=true`.
- The surrounding prose referred to prefix counts, timer health, state transitions, and connection attempt rates as Cilium metrics. Updated the wording to match the documented metrics: current session state, advertised and received route counts, reconciliation errors, and session state changes.

## Review Notes
The post is now technically valid for current Cilium BGP Control Plane monitoring. The exact Prometheus `job` and Kubernetes scrape labels may vary depending on the Prometheus Operator or standalone Prometheus scrape configuration.

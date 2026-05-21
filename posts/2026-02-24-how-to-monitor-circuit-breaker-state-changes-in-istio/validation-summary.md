# Validation Summary: How to Monitor Circuit Breaker State Changes in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DestinationRule
- Istio outlier detection
- Envoy circuit breaking and outlier detection metrics
- Prometheus and PromQL alerting
- Grafana dashboard queries
- Kubernetes kubectl and workload manifests

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio circuit breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy outlier detection architecture: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy cluster manager statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy admin clusters API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/clusters.proto.html

## Issues Found
- Replaced `envoy_cluster_outlier_detection_ejections_total` with `envoy_cluster_outlier_detection_ejections_enforced_total` in Prometheus examples. Envoy documents `ejections_total` as deprecated; `ejections_enforced_total` is the current counter for enforced ejections.
- Clarified the meaning of `interval` in the DestinationRule example. Consecutive 5xx ejection is not counted inside a 10-second window; Envoy uses `interval` for interval-based checks and recovery bookkeeping.
- Updated the `/clusters?format=json` jq example to expose `.health_status.failed_outlier_check`, which is the specific flag showing outlier ejection state in Envoy's admin cluster host status.
- Changed the "all hosts ejected" alert description. Envoy documentation states ejected hosts are excluded from normal load balancing unless the load balancer enters panic behavior, so saying all requests will fail was too absolute.
- Corrected the ejection duration explanation from exponential growth to Envoy's documented `baseEjectionTime` multiplied by the consecutive ejection count, capped by maximum ejection time.
- Added the missing Kubernetes Service to the test manifest so `fault-service` is actually addressable through Kubernetes service discovery.
- Adjusted the correlation guidance to say traffic to ejected hosts should drop, rather than implying the overall service request rate must drop.

## Review Notes
The post is technically valid after the corrections. Exact Prometheus label names for Envoy stats can vary depending on scrape and tag extraction configuration, so production users should confirm labels such as `cluster_name` in their own Prometheus before copying alert rules unchanged.

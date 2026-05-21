# Validation Summary: How to Set Up Alerting Rules for Istio Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Prometheus alerting rules and PromQL
- Prometheus Operator PrometheusRule resources
- Alertmanager
- Envoy metrics
- Kubernetes custom resources

## Sources Consulted
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio pilot-discovery metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus promtool documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus Operator API reference for PrometheusRule, RuleGroup, and Rule fields: https://prometheus-operator.dev/docs/api-reference/api/
- Envoy cluster circuit breaker statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The xDS push error alert used `pilot_xds_push_errors`, which is not listed in the current Istio pilot-discovery metrics reference. Changed the expression to use the documented `pilot_xds_pushes` metric, whose description covers Pilot build and send errors for xDS pushes.
- The configuration conflict alert included old outbound listener conflict metric names that are not listed in the current Istio pilot-discovery metrics reference. Replaced them with the documented `pilot_conflict_outbound_listener_tcp_over_current_tcp` metric and kept `pilot_conflict_inbound_listener`.
- The best-practices section said a 5-minute `for` duration means 5 consecutive evaluation cycles. Prometheus defines `for` as a duration the alert must remain active before firing, independent of the number of evaluation cycles. Reworded the sentence accordingly.

## Review Notes
The service-level Istio metric names, labels, PrometheusRule shape, Prometheus templating examples, and `promtool check rules` command are consistent with current official documentation. Some example thresholds and the `up{job="istiod"}` selector are deployment-specific and may need adjustment for a cluster's scrape labels and SLOs.

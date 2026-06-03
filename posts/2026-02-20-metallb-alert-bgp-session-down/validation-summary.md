# Validation Summary: How to Alert on MetalLB BGP Session Down with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB BGP mode
- MetalLB FRR-K8s metrics
- Prometheus and PromQL
- Prometheus Operator PrometheusRule CRD
- BFD
- Alertmanager

## Sources Consulted
- MetalLB Prometheus metrics documentation: https://metallb.io/prometheus-metrics/
- MetalLB troubleshooting documentation for BGP session state metrics: https://metallb.io/troubleshooting/index.html
- MetalLB Helm chart PrometheusRule template and values in the official repository: https://github.com/metallb/metallb
- FRR-K8s metrics collectors and tests in the official repository: https://github.com/metallb/frr-k8s
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.0/querying/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post used only `metallb_bgp_session_up`, which is correct for MetalLB native BGP mode and deprecated FRR mode, but not for the current default FRR-K8s backend. Updated the metric explanation, query example, and PromQL rules to also match `frrk8s_bgp_session_up`.
- The BGP update, notification, and BFD examples used only `metallb_*` metric names. Updated the PromQL expressions to match both `metallb_*` and current default `frrk8s_*` names where the equivalent metrics exist.
- The examples assumed a `node` label in alert annotations and aggregation. The documented raw MetalLB/FRR-K8s metrics are peer/VRF-oriented, and MetalLB's own Helm alert template uses the scraped `pod` label. Updated examples from node-based wording to target/pod-based wording.
- The "all sessions down" alert name and description were node-specific. Renamed the example alert to `MetalLBAllBGPSessionsDownOnTarget` and changed its aggregation from `count by (node)` to `count by (pod)`.
- The Prometheus API query placed an unencoded PromQL expression directly in the URL. Replaced it with `curl -G --data-urlencode` against `/api/v1/query`, matching Prometheus API expectations for query parameters.

## Review Notes
- The `pod` label depends on Kubernetes/Prometheus scrape metadata, as it does in MetalLB's Helm alert template. Environments with custom scrape configurations may need to use `instance` or another target label instead.
- The `MetalLBNoBGPUpdates` alert can be noisy because no BGP UPDATE messages for a period may be normal when service advertisements are stable; the post already notes this caveat.
- `kubectl` and `promtool` were not installed in the review environment, so Kubernetes command execution and Prometheus rule parsing could not be run locally. The snippets were reviewed against official documentation and source.

# Validation Summary: How to Implement Envoy Outlier Detection for Automatic Ejection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Envoy Proxy
- Envoy outlier detection
- Envoy active health checks
- Envoy admin `/stats` and `/clusters` endpoints
- Prometheus alerting
- Python Flask

## Sources Consulted
- Envoy outlier detection architecture documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy outlier detection v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy panic threshold documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/panic_threshold.html
- Envoy health check v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto
- Envoy admin clusters v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/clusters.proto.html

## Issues Found
- The post described repeated ejection time as exponential. Envoy calculates ejection time from `base_ejection_time` multiplied by the number of ejections and capped by `max_ejection_time`, so the wording was corrected.
- The basic configuration set `enforcing_consecutive_gateway_failure: 0` while the text said hosts would be ejected after consecutive gateway failures. Changed it to `100` so the example matches the explanation.
- Gateway failures were described as connection refused, reset, and timeout. Envoy's `consecutive_gateway_failure` applies to HTTP 502, 503, and 504 responses; local-origin failures cover timeouts, resets, and connection failures when split mode is enabled. Updated comments accordingly.
- The active health-check snippet claimed `codec_client_type` was related to not counting health-check failures as outlier events. Updated the comment to state that it selects HTTP/1.1 health-check requests.
- The monitoring section used deprecated outlier detection counters such as `ejections_total` and `ejections_consecutive_5xx`. Updated the examples and Prometheus expression to use current `ejections_enforced_*` counters.
- The Flask failure simulator slept for 10 seconds to cause a timeout, but Envoy's default route timeout is 15 seconds. Increased the sleep to 20 seconds.
- The Flask simulator labeled a 503 response as a connection reset. Updated the label and comment to describe it as a gateway failure response.
- Panic threshold wording said ejections exceed the threshold. Envoy enters panic when available hosts in a priority fall below the configured panic threshold, so the explanation and comment were corrected.

## Review Notes
The snippets use current Envoy v3 configuration fields. The examples are illustrative and still require real DNS names or service discovery entries for the backend hostnames before they can run in a live environment.

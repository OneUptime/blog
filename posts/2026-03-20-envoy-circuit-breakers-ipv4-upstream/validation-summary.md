# Validation Summary: How to Set Up Envoy Circuit Breakers for IPv4 Upstream Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- Envoy cluster circuit breakers
- Envoy admin stats
- Envoy HTTP retry policy
- Envoy outlier detection
- YAML configuration
- IPv4 upstream addressing

## Sources Consulted
- Envoy circuit breaking documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_circuit_breakers
- Envoy circuit breakers v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy admin interface quick start: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/admin.html
- Envoy HTTP route components v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy retry plugin configuration overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_connection_management.html
- Envoy outlier detection v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto.html
- Envoy outlier detection architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier

## Issues Found
- The post used `curl http://127.0.0.1:9901/stats | grep circuit_breakers` while describing overflow counters such as `upstream_cx_overflow` and `upstream_rq_pending_overflow`. Those counters do not match `grep circuit_breakers`, so the command would not show the metrics being discussed. I changed the command to filter for both the circuit-breaker gauge and the relevant overflow counters, and I added `upstream_rq_active_overflow` because it is the counter associated with `max_requests`.
- The monitoring commands assumed Envoy's admin interface was available on `127.0.0.1:9901`, but the main config snippet did not configure an `admin` listener. I added the minimal top-level `admin` block required for the `/stats` examples to work as written.
- The `consecutive_5xx` comment said it ejects a host after 5 consecutive `5xx` errors. In Envoy's default outlier-detection mode, locally originated failures are also counted in that bucket unless `split_external_local_origin_errors` is enabled. I corrected the comment to reflect that behavior.

## Review Notes
- The cluster, retry, and outlier-detection snippets use current Envoy v3 configuration fields and do not rely on deprecated circuit-breaker APIs.
- The retry example's `previous_hosts` predicate is acceptable as written for this built-in empty-config extension, although current Envoy examples often show the equivalent explicit `typed_config` form.

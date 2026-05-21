# Validation Summary: How to Set Up Security Monitoring and Alerting in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- Prometheus and PromQL
- Prometheus Operator
- Kubernetes
- Alertmanager
- Grafana

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio mesh `ProxyStatsMatcher` reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio security troubleshooting and `istioctl proxy-config secret` examples: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio `istioctl proxy-config secret` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy listener TLS statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy RBAC filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rbac_filter
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Prometheus sample installation URL used the old `release-1.22` branch. Updated it to the current Istio documentation's `release-1.30` sample URL.
- The Prometheus Operator example used a `ServiceMonitor` with labels that do not match Istio sidecar pods. Replaced it with a `PodMonitor` that scrapes pods exposing the `http-envoy-prom` port.
- Several Envoy TLS metric names were incorrect or too broad. Replaced `envoy_server_ssl_*` and `envoy_cluster_ssl_handshake_error` examples with Envoy listener TLS metrics such as `envoy_listener_ssl_connection_error`, `envoy_listener_ssl_fail_verify_*`, and `envoy_server_days_until_first_cert_expiring`.
- The authorization-denial query used `response_flags="UAEX"`, which represents external authorization denial and does not isolate normal Istio RBAC denials. Updated the query to use HTTP 403 metrics and noted that Envoy access logs should be used to distinguish RBAC denials from application-generated 403 responses.
- The connection-spike example compared a 5-minute rate with `rate(...[1h])`, which is not an hourly average of 5-minute rates. Updated it to use a PromQL subquery with `avg_over_time`.
- The mTLS coverage query did not restrict the denominator to destination-reported metrics, even though Istio documents `connection_security_policy="mutual_tls"` as populated for destination reports. Added `reporter="destination"` to both numerator and denominator.
- The AlertmanagerConfig example used older route matching syntax and omitted explicit Slack/PagerDuty secret references for current Prometheus Operator examples. Updated it to `monitoring.coreos.com/v1beta1`, `matchers`, Slack `apiURL`, and PagerDuty `routingKey`.
- Added a note that many `envoy_*` metrics require `proxyStatsMatcher` configuration because Istio records a minimal Envoy stats set by default.

## Review Notes
The post is technically valid after the corrections. The remaining alert thresholds are illustrative and should be tuned per mesh size, traffic profile, and Prometheus retention/cardinality constraints.

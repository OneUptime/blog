# Validation Summary: How to Set Up Egress Gateway for Auditing External Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio egress gateways
- Istio Telemetry API
- Istio ServiceEntry, Gateway, DestinationRule, and VirtualService resources
- Envoy access logging and EnvoyFilter
- Kubernetes NetworkPolicy
- Fluentd and Elasticsearch log shipping
- Prometheus Operator PrometheusRule alerts
- PCI DSS, SOC 2, HIPAA, and GDPR retention considerations

## Sources Consulted
- Istio Egress Gateways task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio Telemetry API task and reference: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/ and https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy access log task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio ServiceEntry, VirtualService, and DestinationRule references: https://istio.io/latest/docs/reference/config/networking/service-entry/, https://istio.io/docs/reference/config/networking/virtual-service/, and https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Prometheus alerting rules and functions documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/ and https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Envoy access log usage and TCP proxy API reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html and https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/tcp_proxy/v3/tcp_proxy.proto.html
- PCI DSS v4.0 SAQ C audit log retention reference: https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-C.pdf
- HIPAA Security Rule documentation retention requirement, 45 CFR 164.316: https://ecfr.io/Title-45/Section-164.316
- UK ICO GDPR storage limitation guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/

## Issues Found
- The post said the Telemetry API configured a custom log format. Istio Telemetry accessLogging enables/selects providers, while custom formatting requires Envoy configuration or provider configuration. Updated the wording to say Telemetry enables access logging.
- The EnvoyFilter configured an HTTP connection manager and HTTP-only fields for a TLS passthrough egress gateway. In TLS passthrough, the gateway cannot inspect encrypted HTTP method, path, headers, or status code. Updated the example to patch `envoy.filters.network.tcp_proxy` and log connection-level fields such as SNI, upstream host, byte counts, duration, response flags, and upstream cluster.
- The egress routing example omitted the DestinationRule subset used by Istio's documented egress gateway pattern for SNI-based routing through the gateway. Added a `DestinationRule` and referenced its subset from the VirtualService route to the egress gateway.
- The NetworkPolicy allowed egress to the whole `istio-system` namespace and described that as only allowing the egress gateway path. Updated the policy to combine `namespaceSelector` with `podSelector` so it allows only egress gateway pods, and clarified that NetworkPolicy enforcement requires a capable CNI.
- The monitoring example used an HTTP request latency histogram for TLS passthrough traffic. Istio documents HTTP request duration metrics for HTTP/HTTP2/gRPC and TCP connection metrics for TCP traffic. Replaced the latency alert with a TCP connection-rate alert and made the gateway-down alert depend on kube-state-metrics deployment availability.
- The failed-egress query used `response_code`, which is not present in the corrected TLS passthrough TCP access log fields. Updated it to query Envoy `response_flags` instead.
- The retention section overstated SOC 2 and HIPAA as fixed raw log-retention requirements. Updated the language to distinguish PCI DSS's specific audit log retention period, SOC 2 control/auditor expectations, HIPAA's six-year Security Rule documentation retention, and GDPR storage limitation.

## Review Notes
The examples are technically valid as templates, but production deployments should still tune thresholds, log schemas, Elasticsearch/Fluentd configuration, and NetworkPolicies for the cluster's CNI, Prometheus labels, SIEM parser, and compliance scope.

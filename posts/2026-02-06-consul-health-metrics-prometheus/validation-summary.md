# Validation Summary: How to Monitor HashiCorp Consul Service Health and Mesh Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HashiCorp Consul
- Consul service mesh / Connect
- Envoy
- Prometheus
- OpenTelemetry Collector

## Sources Consulted
- HashiCorp Consul telemetry configuration reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/telemetry
- HashiCorp Consul agent metrics API: https://developer.hashicorp.com/consul/api-docs/agent#view-metrics
- HashiCorp Consul agent telemetry metrics reference: https://developer.hashicorp.com/consul/docs/reference/agent/telemetry
- HashiCorp Consul agent telemetry monitoring guide: https://developer.hashicorp.com/consul/docs/monitor/telemetry/agent
- HashiCorp Consul Envoy proxy configuration reference: https://developer.hashicorp.com/consul/docs/connect/proxies/envoy
- HashiCorp Consul Connect Envoy command reference: https://developer.hashicorp.com/consul/commands/connect/envoy
- HashiCorp Consul Kubernetes service mesh telemetry docs: https://developer.hashicorp.com/consul/docs/observe/telemetry/k8s
- Prometheus configuration reference, including Consul service discovery and HTTP authorization: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor

## Issues Found
- The post stated that the Consul agent Prometheus endpoint exposes service health status gauges such as `consul_health_service_status` and `consul_catalog_service_node_healthy`. Those metrics are not Consul agent telemetry metrics. I replaced that section with catalog and memberlist metrics from the official Consul telemetry reference and added a note that per-service health status should come from Consul service discovery labels or a dedicated consul_exporter.
- The service mesh metric examples used `consul_connect_*` names that do not match current Consul agent telemetry names. I replaced them with documented intention, mesh CA expiry, and leaf certificate expiry metrics.
- The Raft section included `consul_raft_applied_index`, which is not listed in the current Consul telemetry reference. I replaced it with `consul_raft_last_index` and corrected the descriptions for candidate and leader counters.
- The metric filter allowed non-agent metric prefixes such as `consul_health_.*` and `consul_connect_.*`. I updated the filter to include documented Consul agent telemetry prefixes for catalog, client API, intentions, mesh certificates, memberlist, members, and autopilot metrics.
- The Consul service discovery example claimed `services: []` discovers all Consul agents. Prometheus Consul SD discovers catalog services, not agents directly. I changed the example to discover catalog-registered Consul targets with `services: ["consul"]`.
- The OpenTelemetry Collector Prometheus receiver example used Prometheus relabel replacements like `$1:8500`. The receiver documentation notes that `$` must be escaped in embedded Prometheus config, so I changed these to `$$1:8500` and `$$1:20200`.
- The Envoy sidecar section claimed sidecars expose metrics on port 19000 by default. Consul documents `envoy_prometheus_bind_addr` as the Prometheus metrics listener that must be configured, with the `consul connect envoy` Prometheus scrape path defaulting to `/metrics`. I updated the text and example to use a configured metrics port and `/metrics`.
- The alert example used invalid PromQL with a unit suffix: `consul_raft_leader_lastContact > 15000ms`. I replaced it with a PromQL expression based on the summary `_sum` and `_count` series.

## Review Notes
The post is now technically accurate as a Consul agent telemetry and Envoy metrics guide. The title still references service health; the corrected content explains that direct per-service health status is not emitted by the Consul agent telemetry endpoint and should be obtained through Consul service discovery labels or consul_exporter.

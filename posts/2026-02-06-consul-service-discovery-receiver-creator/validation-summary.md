# Validation Summary: How to Use Consul Service Discovery with the OpenTelemetry Collector Receiver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus receiver
- Prometheus Consul service discovery
- HashiCorp Consul service catalog, tags, metadata, and health checks
- Collector YAML configuration

## Sources Consulted
- OpenTelemetry Collector Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/prometheusreceiver
- OpenTelemetry Collector receiver_creator README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/receivercreator
- OpenTelemetry Collector observer extensions directory: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/observer
- Prometheus configuration reference for `consul_sd_configs`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#consul_sd_config
- HashiCorp Consul Health API documentation: https://developer.hashicorp.com/consul/api-docs/health
- HashiCorp Consul filtering syntax documentation: https://developer.hashicorp.com/consul/api-docs/features/filtering

## Issues Found
- The post described an `observer/consul` Collector extension, but the current OpenTelemetry Collector contrib observer extensions do not include a Consul observer. I replaced the unsupported observer and receiver-creator configuration with the supported Prometheus receiver plus Prometheus `consul_sd_configs`.
- The post described receiver-creator rules and endpoint fields such as `annotations["metrics_path"]`, `endpoint`, and `resource_attributes` for Consul-discovered targets. Those fields apply to supported observer endpoint types, not to a nonexistent Consul observer. I replaced them with Prometheus relabeling using Consul discovery meta labels such as `__meta_consul_service_metadata_metrics_path`, `__meta_consul_service_id`, and `__meta_consul_health`.
- The post claimed only healthy services are discovered by default and showed a `health_checks: true` Consul observer setting. Prometheus Consul service discovery exposes health state as `__meta_consul_health`; it does not use that Collector setting. I changed the examples to keep targets with `__meta_consul_health` equal to `passing`.
- The post showed service tag filtering through a Consul observer `tags` field. Prometheus documents `tags` as deprecated in favor of `filter` and `health_filter`, so I changed the tag filtering example to `health_filter: '"metrics-enabled" in Service.Tags'`.
- The multi-datacenter example used multiple nonexistent Consul observers. I changed it to multiple Prometheus scrape jobs, each with a Consul `server` and `datacenter`.

## Review Notes
The validated version intentionally pivots from receiver creator to the Prometheus receiver because receiver creator is real, but there is no current upstream Consul observer for it to watch. The Prometheus receiver is the supported Collector path for Consul service discovery because it embeds Prometheus scrape configuration, including service discovery and relabeling.

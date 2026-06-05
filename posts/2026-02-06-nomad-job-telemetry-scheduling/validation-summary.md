# Validation Summary: How to Use the OpenTelemetry Collector with HashiCorp Nomad Job Telemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Nomad telemetry
- Nomad Metrics HTTP API
- Prometheus scrape configuration and PromQL
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector Prometheus receiver, resource processor, filter processor, batch processor, and OTLP exporter
- Nomad job specifications and Consul service discovery

## Sources Consulted
- HashiCorp Nomad telemetry configuration: https://developer.hashicorp.com/nomad/docs/configuration/telemetry
- HashiCorp Nomad Metrics HTTP API: https://developer.hashicorp.com/nomad/api-docs/metrics
- HashiCorp Nomad metrics reference: https://developer.hashicorp.com/nomad/docs/reference/metrics
- HashiCorp Nomad Prometheus monitoring tutorial: https://developer.hashicorp.com/nomad/tutorials/manage-clusters/prometheus-metrics
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/prometheusreceiver
- OpenTelemetry Collector official releases: https://github.com/open-telemetry/opentelemetry-collector-releases

## Issues Found
- The scheduling metric `nomad_nomad_worker_invoke_scheduler` omitted the scheduler type suffix. Updated it to `nomad_nomad_worker_invoke_scheduler_<type>` to match Nomad's documented `nomad.nomad.worker.invoke_scheduler.<type>` metric.
- The allocation metric `nomad_client_allocs_start` is not the documented Nomad metric. Updated it to `nomad_client_allocations_start`, matching `nomad.client.allocations.start`.
- The host CPU metric `nomad_client_host_cpu_total` is not documented. Updated it to `nomad_client_host_cpu_total_percent`, matching `nomad.client.host.cpu.total_percent`.
- The cluster health metrics `nomad_raft_leader`, `nomad_raft_peers`, and `nomad_serf_member_status` were not documented as Nomad Prometheus metrics. Replaced them with documented Raft and Serf metrics.
- The Collector filter processor example used the older include-style metric filter configuration. Updated it to the current OTTL-based `metric_conditions` format used by the filter processor in recent Collector releases.
- The Collector image version `0.96.0` was outdated. Updated the example to `0.153.0`, the current official Collector release available on June 5, 2026.
- The PromQL `rate()` examples did not include range selectors. Updated them to use `[5m]` ranges.
- The node saturation alert used an invalid subtraction between mismatched metrics. Replaced it with a direct CPU utilization threshold using `nomad_client_host_cpu_total_percent`.

## Review Notes
The updated Collector configuration was validated with `otel/opentelemetry-collector-contrib:0.153.0 validate --config=env:CFG`. The Nomad job HCL was reviewed against Nomad job-spec patterns, but the local environment does not have the `nomad` CLI installed, so it was not validated with `nomad job validate`.

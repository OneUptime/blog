# Validation Summary: How to Monitor etcd Cluster Health Metrics with the Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry Collector filter, resource, batch, transform processors
- OpenTelemetry OTLP exporter
- etcd metrics
- etcdctl
- Kubernetes kubeadm control plane certificates
- PromQL

## Sources Consulted
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/filterprocessor
- OpenTelemetry Collector processor list and stability documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Prometheus configuration documentation for scrape configs and TLS config: https://prometheus.io/docs/operating/configuration/
- etcd v3.6 metrics documentation and generated metrics list: https://etcd.io/docs/v3.6/metrics/ and https://etcd.io/docs/v3.6/metrics/etcd-metrics-latest/
- etcd system limits documentation: https://etcd.io/docs/v3.6/dev-guide/limit/
- etcd cluster status / etcdctl endpoint documentation: https://etcd.io/docs/v3.6/tasks/operator/how-to-check-cluster-status/
- etcd gRPC proxy TLS example showing etcdctl TLS flags: https://etcd.io/docs/v3.6/op-guide/grpc_proxy/
- Kubernetes kubeadm etcd healthcheck client certificate documentation: https://kubernetes.io/docs/reference/setup-tools/kubeadm/generated/kubeadm_init/kubeadm_init_phase_certs_etcd-healthcheck-client/
- Kubernetes PKI certificates and requirements: https://kubernetes.io/docs/setup/best-practices/certificates/

## Issues Found
- The filter processor example included `etcd_mvcc_keys_total`, which is not present in the current etcd generated metrics list. Changed it to `etcd_debugging_mvcc_keys_total`, which is the documented key-count metric.
- The filter processor example included `grpc_server_handling_seconds.*`, which is not present in the current etcd generated metrics list. Changed it to the documented `grpc_server_started_total`.
- The transform processor example used `value_int` for Prometheus-scraped etcd metrics. Prometheus samples are floating-point values in the Collector data model, so the OTTL conditions were changed to use `datapoint.value_double`.
- The transform processor example used the older explicit `context: datapoint` structure. Updated it to the current inferred-context OTTL style shown in the transform processor documentation.
- The alerting threshold described 8 GB as the default etcd database limit. Current etcd documentation says the default storage size limit is 2 GiB and 8 GiB is a suggested maximum for normal environments. Replaced the fixed-size threshold with a ratio against `etcd_server_quota_backend_bytes`.
- The fragmentation transform snippet had no executable transform statements and would not be a valid Collector processor configuration. Replaced it with a PromQL expression that calculates the unused allocated-space ratio from the documented etcd database size metrics.
- The Kubernetes section described the example as a managed control plane case, but managed control planes usually do not expose host etcd certificates to user workloads. Changed the wording to self-managed Kubernetes control plane.

## Review Notes
- `etcd_debugging_*` metrics are documented by etcd as implementation-dependent and volatile. The post uses `etcd_debugging_mvcc_keys_total`; this is acceptable for operational visibility, but dashboards should tolerate the metric changing or disappearing across etcd releases.
- The OTLP exporter example may need TLS settings such as `tls.insecure: true` when exporting to a plaintext internal endpoint. The snippet is still syntactically valid because OTLP endpoint security depends on the receiving backend and deployment.

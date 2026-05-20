# Validation Summary: How to Deploy Tempo with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Grafana Tempo
- Grafana Helm charts
- Argo CD
- Kubernetes
- OpenTelemetry Operator and Collector
- Grafana Tempo datasource provisioning
- Prometheus remote write
- Amazon S3 object storage

## Sources Consulted
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo v2.6 release notes: https://grafana.com/docs/tempo/latest/release-notes/v2-6/
- Grafana Tempo consistent hash ring documentation: https://grafana.com/docs/tempo/latest/operations/manage-advanced-systems/consistent_hash_ring/
- Grafana `tempo-distributed` Helm chart 1.18.2 `Chart.yaml`: https://raw.githubusercontent.com/grafana/helm-charts/tempo-distributed-1.18.2/charts/tempo-distributed/Chart.yaml
- Grafana `tempo-distributed` Helm chart 1.18.2 `values.yaml`: https://raw.githubusercontent.com/grafana/helm-charts/tempo-distributed-1.18.2/charts/tempo-distributed/values.yaml
- Grafana Tempo datasource provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- OpenTelemetry Operator for Kubernetes documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/

## Issues Found
- The `multitenancyEnabled` Helm value was incorrectly nested under `tempo`. Moved it to the `tempo-distributed` chart's top level, where chart 1.18.2 expects it.
- The distributor receiver configuration was placed under `distributor.receivers`, which the chart does not render. Replaced it with the chart-supported `traces.*.enabled` values for OTLP, Jaeger, and Zipkin receivers.
- The query frontend example used `queryFrontend.config.search.max_duration`, which is not consumed by the chart's values template. Replaced it with supported `concurrent_jobs` and `target_bytes_per_job` settings.
- The metrics-generator was enabled without enabling its processors in Tempo overrides. Added `overrides.defaults.metrics_generator.processors` for `service-graphs` and `span-metrics`.
- The Grafana datasource example used older or unsupported provisioning keys for trace-to-logs and Loki search. Updated it to the documented `tracesToLogsV2` block and removed unsupported keys.
- The verification command comment described querying a trace as an ingestion test. Reworded it as a trace lookup test.
- The scaling guidance said the compactor should stay single-replica to avoid conflicts. Updated it to reflect Tempo's compactor ring, which shards compaction jobs and prevents races between compactors.

## Review Notes
- The S3 example leaves access keys empty, which is appropriate when credentials are supplied through the AWS SDK credential chain, such as an IAM role for the pod. A production deployment still needs the corresponding Kubernetes service account and cloud IAM setup outside this snippet.
- The Prometheus remote write endpoint assumes the Prometheus deployment accepts remote write traffic.

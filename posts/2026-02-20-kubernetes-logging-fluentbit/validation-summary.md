# Validation Summary: How to Set Up Centralized Logging in Kubernetes with Fluent Bit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Fluent Bit
- Fluent Bit Helm chart
- Helm
- Elasticsearch output
- OpenTelemetry output
- S3 output
- Prometheus ServiceMonitor

## Sources Consulted
- Fluent Bit Helm chart values and templates: https://github.com/fluent/helm-charts/tree/main/charts/fluent-bit
- Fluent Bit classic mode configuration: https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/classic-mode/configuration-file
- Fluent Bit Tail input documentation: https://docs.fluentbit.io/manual/pipeline/inputs/tail
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/pipeline/filters/kubernetes
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch
- Fluent Bit OpenTelemetry output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/opentelemetry
- Fluent Bit S3 output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/s3
- Fluent Bit monitoring documentation: https://docs.fluentbit.io/manual/administration/monitoring
- Kubernetes ServiceMonitor reference from Prometheus Operator: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The original Helm values added `extraVolumes` and `extraVolumeMounts` for paths that the official Fluent Bit Helm chart already mounts by default for DaemonSet deployments. The sample also mounted `/var/log` read-only while the Tail input position database was configured under `/var/log`, which would prevent Fluent Bit from writing its DB file. Removed the redundant mounts and noted the chart defaults.
- The pipeline was shown as a standalone ConfigMap, but the deployment command only installed the Helm chart with `fluent-bit-values.yaml`; it never applied or referenced that ConfigMap. Changed the pipeline snippet to use the chart-supported `config.service`, `config.inputs`, `config.filters`, and `config.customParsers` values.
- The output examples were shown as additional ConfigMap files, but they were not included from the active Fluent Bit configuration. Changed the examples to use the chart-supported `config.outputs` value.
- The health endpoint was used in the monitoring step, but the sample service configuration did not enable Fluent Bit health checks. Added `Health_Check On`.
- The Tail input comment said `DB.locking` rotates the database file. Fluent Bit uses this option for exclusive database access, not rotation. Updated the comment.
- The OpenTelemetry output example used `Add_label` as resource attributes. That setting is not the correct way to set OTLP log resource attributes in the Fluent Bit output. Removed the incorrect lines.
- The S3 key format claimed to organize logs by namespace using `$TAG[4]`, but the shown tag pattern does not reliably make `$TAG[4]` the namespace. Changed the example to organize by date only.
- The Elasticsearch comment stated that Elasticsearch does not allow dots in field names. This is version-sensitive, so the comment was softened to describe compatibility with older mappings.

## Review Notes
- The snippets are now YAML-parseable and aligned with the official Fluent Bit Helm chart values structure.
- The examples intentionally remain backend placeholders; users still need to configure real Elasticsearch, OpenTelemetry Collector, or S3 credentials and network access for their own clusters.

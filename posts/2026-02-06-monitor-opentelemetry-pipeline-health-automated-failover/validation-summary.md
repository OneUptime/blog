# Validation Summary: How to Monitor OpenTelemetry Pipeline Health and Trigger Automated Failover

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector health_check extension
- OpenTelemetry Collector internal telemetry
- Prometheus alert rules
- Python requests-based controller
- Kubernetes Services, Deployments, readiness probes, and liveness probes

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector health_check extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/healthcheckextension
- OpenTelemetry Collector health_check extension sample config: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/testdata/config.yaml
- OpenTelemetry Collector failover connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/failoverconnector
- OpenTelemetry Collector zPages extension README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/extension/zpagesextension
- Kubernetes liveness/readiness/startup probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes Deployment API requirement for selectors: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Collector telemetry snippet used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated the example to configure a pull Prometheus reader with `host`, `port`, and `without_units`.
- The post recommended `check_collector_pipeline` and claimed it ties the health endpoint to pipeline health. The official health_check extension README warns that this feature does not work as expected and recommends not using it. Removed it from the config and changed the explanation to rely on internal metrics for pipeline degradation.
- The memory alert divided RSS by `otelcol_process_runtime_total_alloc_bytes`, a cumulative allocation counter, which is not a valid memory utilization ratio. Replaced it with a fixed RSS threshold example.
- The Python controller compared lifetime cumulative counters directly. Updated it to compare deltas between scrapes and to sum matching Prometheus series.
- The Kubernetes Deployment example was missing the required `spec.selector` for `apps/v1`. Added a selector matching the pod template labels.
- The Kubernetes readiness-probe wording claimed pipeline-degraded collectors would be removed from Service endpoints. Updated it to say unready collectors are removed, matching Kubernetes probe behavior and the corrected health_check semantics.

## Review Notes
- The failover connector is currently documented as alpha for traces, metrics, and logs; the post's mention of it is accurate but should be treated as version-sensitive.
- The example still uses `otel/opentelemetry-collector-contrib:latest`; pinning a Collector image version would be preferable for production examples.
- The fixed RSS memory threshold is an example threshold. In production, it should be set from the Collector's memory SLO or container memory limit.

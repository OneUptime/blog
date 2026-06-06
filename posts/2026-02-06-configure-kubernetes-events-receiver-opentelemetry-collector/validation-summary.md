# Validation Summary: How to Configure the Kubernetes Events Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Kubernetes Events Receiver (`k8s_events`)
- Kubernetes Cluster Receiver (`k8s_cluster`)
- OpenTelemetry Collector processors: `batch`, `filter`, `resource`, `transform`, `memory_limiter`
- OpenTelemetry Collector exporters: `debug`, `otlp`
- Kubernetes RBAC, ServiceAccount, ClusterRole, RoleBinding, and Deployment manifests
- `kubectl` troubleshooting commands

## Sources Consulted
- OpenTelemetry Collector Contrib Kubernetes Events Receiver documentation and source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/k8seventsreceiver
- OpenTelemetry Collector Contrib Kubernetes Events Receiver conversion code: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8seventsreceiver/k8s_event_to_logdata.go
- OpenTelemetry Collector Contrib Filter Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector Contrib Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector Attributes Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/attributesprocessor
- OpenTelemetry Collector Debug Exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- OpenTelemetry Collector Memory Limiter Processor documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/processor/memorylimiterprocessor
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib Kubernetes Cluster Receiver documentation and config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/k8sclusterreceiver
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Events API reference: https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/event-v1/
- `otelcol-contrib` v0.153.0 `validate` command

## Issues Found
1. The basic configuration used the removed `logging` exporter with `loglevel`. Replaced it with the current `debug` exporter and `verbosity: detailed`.
2. Several filter processor examples used the older include/exclude `logs` configuration. Updated them to the current OTTL `log_conditions` form used by Collector v0.146.0 and later.
3. The post described `k8s.event.type`, but the receiver maps Kubernetes event type to the log record severity text. Updated the metadata list and filter examples to use `severity_text` / `log.severity_text`.
4. The RBAC examples granted `events.k8s.io` permissions and claimed both API groups were required. The current receiver watches core `v1` Events (`apiGroups: [""]`), so the extra API group and claim were removed.
5. Conditional `attributes` processor examples used unsupported per-action `filters` blocks. Replaced those examples with the `transform` processor and OTTL `where` clauses.
6. Environment variable references used the older `${VAR}` form. Updated Collector examples to `${env:VAR}`.
7. The deduplication section used `groupbyattrs`, which groups telemetry by attributes but does not deduplicate events. Replaced it with the receiver's `dedup_interval` setting.
8. The production pipeline placed `memory_limiter` after other processors. Moved it first in the pipeline, matching the processor best-practice guidance.
9. The internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Removed the deprecated/ignored setting.
10. The full deployment pinned `otel/opentelemetry-collector-contrib:0.93.0`, which is outdated for the current Collector configuration shown. Updated it to `0.153.0`.

## Review Notes
Representative corrected Collector configurations were validated with `otelcol-contrib validate` using v0.153.0. Configs that rely on `${env:...}` require those environment variables to be set at validation/runtime.

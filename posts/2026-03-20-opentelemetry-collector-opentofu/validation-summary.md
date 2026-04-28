# Validation Summary: How to Deploy OpenTelemetry Collector with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector (DaemonSet and Deployment/Gateway modes)
- OpenTofu / Terraform (HCL2)
- `helm_release` resource (HashiCorp Helm provider)
- OpenTelemetry Collector Helm chart (`opentelemetry-collector`)
- OTLP receiver/exporter (gRPC + HTTP)
- `hostmetrics`, `k8s_events` receivers
- `batch`, `memory_limiter`, `k8sattributes`, `resource`, `tail_sampling` processors
- `otlp`, `prometheusremotewrite`, `debug` exporters
- Kubernetes (DaemonSet, Deployment, ConfigMap)
- Jaeger, Prometheus (remote write), Loki, Datadog (referenced)

## Sources Consulted
- OpenTelemetry Collector Helm Chart: https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-collector
- Logging exporter deprecation/removal announcement (replaced by debug exporter): https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- Migrating away from the Jaeger exporter in the Collector: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- k8seventsreceiver deprecation in favor of k8sobjectsreceiver: https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/24242
- Important Components for Kubernetes (OTel docs): https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- HCL2 / Terraform configuration syntax (Types and Values): https://developer.hashicorp.com/terraform/language/expressions/types
- HCL Native Syntax Specification: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- `tailsamplingprocessor` documentation (status_code, latency policies): https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- `k8sattributesprocessor` documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/k8sattributesprocessor
- `hostmetricsreceiver` documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/hostmetricsreceiver

## Issues Found

1. **HCL2 syntax error: missing commas between list elements (DaemonSet config).**
   In the `resource` processor, two object literals were placed on consecutive lines inside a list with no comma separator. HCL2 requires commas between tuple/list elements (newlines do *not* substitute for commas in lists, only inside maps/objects). Fixed by adding the trailing commas:
   ```hcl
   attributes = [
     { key = "deployment.environment", value = var.environment, action = "insert" },
     { key = "k8s.cluster.name",       value = var.cluster_name, action = "insert" },
   ]
   ```

2. **HCL2 syntax error: missing comma between `tail_sampling` policies.**
   Same problem in the gateway config — two policy objects in the `policies` list had no separator. Added a comma between the `errors-policy` and `slow-policy` entries.

3. **Wrong port for OTLP exporter to Jaeger (`14250` → `4317`).**
   The `otlp` exporter speaks the OpenTelemetry Protocol, but port `14250` on a Jaeger collector is the legacy Jaeger gRPC (`jaeger.api_v2.CollectorService`) endpoint, used by the now-removed `jaeger` exporter. Modern Jaeger (1.35+) accepts OTLP on `4317` (gRPC) and `4318` (HTTP). Sending OTLP to 14250 would fail. Updated both occurrences (DaemonSet and gateway) to `4317` and clarified the comment.

4. **Deprecated `logging` exporter replaced with `debug` exporter.**
   The `logging` exporter was deprecated in OTel Collector v0.86.0 and removed in v0.111.0 (announcement: open-telemetry/opentelemetry-collector#11337). The `debug` exporter is the drop-in replacement and supports the same `verbosity` option. Renamed the exporter from `logging` to `debug` to ensure forward compatibility (it must also be referenced under that name if added to a pipeline).

## Review Notes

- **Helm chart version `0.73.1` is significantly outdated for a 2026 post.** The chart 0.73.x line was released in mid-2023. The configuration shown is still compatible with that chart version, but readers in 2026 should pin to a current release. Left unchanged because the post explicitly pins this version and changing it would require revalidating every field against the new schema.

- **`k8s_events` receiver is deprecated.** It has been deprecated upstream (open-telemetry/opentelemetry-collector-contrib#24242) in favor of the more general `k8sobjects` receiver, which can watch `events.k8s.io` objects via:
  ```yaml
  k8sobjects:
    auth_type: serviceAccount
    objects:
      - { group: events.k8s.io, mode: watch, name: events }
  ```
  Left as-is because (a) `k8s_events` still ships with chart 0.73.1, and (b) the receiver is configured but not referenced in any pipeline in the post, so it has no runtime effect. Worth updating if the post is ever revised against a newer chart.

- **`k8s_events` is configured but never used in a pipeline.** No `logs` pipeline is defined that consumes it. Leaving it in the example as illustrative is acceptable, but the receiver instance is effectively dead config until added to a pipeline.

- **`extraVolumes` / `extraVolumeMounts` for `hostfs` are mounted but `hostmetrics.root_path` already references `/hostfs`.** This pairing is correct for DaemonSet mode running in a container, but readers should be aware that `hostNetwork`/`hostPID` and a privileged-ish security context may also be needed depending on which scrapers (e.g. `process`) are enabled. The set used (`cpu`, `disk`, `filesystem`, `load`, `memory`, `network`) does not require privileged mode.

- **`prometheusremotewrite` endpoint** points at the kube-prometheus-stack remote-write URL; this assumes the user has enabled `--web.enable-remote-write-receiver` on Prometheus, which is not enabled by default. A brief note about that prerequisite would help readers.

- **`tail_sampling` `latency.threshold_ms`** is the correct field name for the latency policy; `status_code.status_codes` accepting `["ERROR"]` is also correct (valid values: `OK`, `ERROR`, `UNSET`).

- **`k8sattributes` `extract.metadata`** values (`k8s.pod.name`, `k8s.namespace.name`, `k8s.deployment.name`) and the `labels` extraction format (`{ from = "pod", key = "app" }`) are valid; `tag_name` defaults to the source `key` so the omitted field is fine.

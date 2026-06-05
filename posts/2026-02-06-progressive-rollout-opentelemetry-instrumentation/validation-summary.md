# Validation Summary: How to Implement Progressive Rollout of OpenTelemetry Instrumentation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Python SDK and OTLP exporter
- OpenTelemetry Operator auto-instrumentation
- Kubernetes Deployments and ConfigMaps
- kubectl rollout and environment variable commands
- Prometheus and PromQL histogram queries
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Operator automatic instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes ConfigMap update documentation: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The collector example used the deprecated and removed `logging` exporter with `loglevel`. Changed it to the current `debug` exporter with `verbosity: basic`, and updated the trace pipeline exporter list.
- The Python feature-flag example attempted to call `trace.NoOpTracerProvider()`, which is not part of the documented Python trace API. Changed the disabled path to leave the default tracer provider in place so spans remain non-recording unless another SDK provider has already been configured.
- The feature-flag wording implied instrumentation could be toggled without restart, but the example reads an environment variable at startup. Updated the wording to describe a config change plus restart instead of a redeploy.
- The Kubernetes Deployment examples omitted `.spec.selector`, which is required for `apps/v1` Deployments and must match pod template labels. Added matching selectors for canary and stable Deployments.
- The PromQL examples calculated `histogram_quantile()` directly over bucket rates, which is unsafe for multi-pod services and can produce invalid vector matching in the canary comparison. Added `sum by (le)` for the canary comparison and `sum by (service, le)` for the alert.
- The OpenTelemetry Operator example used a shared OTLP HTTP endpoint on port 4318 while also including Node.js auto-instrumentation, which defaults to OTLP/gRPC. Added `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` for the Node.js instrumentation block.
- The rollout progress script checked annotation values for the string `opentelemetry`, so it would miss normal operator annotations such as `instrumentation.opentelemetry.io/inject-java: "true"`. Changed it to inspect annotation keys and ignore explicit `"false"` opt-outs.
- The rollout progress script could divide by zero if no non-infrastructure Deployments were found. Added a zero-total guard.

## Review Notes
The post is technically sound after the fixes. The snippets remain illustrative rather than complete production manifests; real deployments should also include authentication headers for OneUptime OTLP ingestion, collector resiliency settings, and service-specific rollout automation.

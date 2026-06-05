# Validation Summary: How to Fix Collector Slow Startup in Kubernetes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib distribution
- OTLP receiver and exporter
- Collector processors, extensions, and exporters
- Kubernetes Deployments, StatefulSets, probes, DNS configuration, and resource requests/limits
- kubectl

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector OTLP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector exporterhelper queue/retry/timeout documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry Collector health check extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes share process namespace documentation: https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post described OTLP exporter connections and DNS resolution as startup-blocking behavior. I changed the wording to distinguish exporter setup during startup from network connection and DNS resolution during export sends.
- The exporter example used the deprecated `logging` exporter and `loglevel`. I changed it to the current `debug` exporter with `verbosity`, `sampling_initial`, and `sampling_thereafter`.
- The `sending_queue` comments said the queue was persistent, but no storage extension was configured. I corrected the comment to describe an in-memory queue.
- The StatefulSet DNS comment said `ndots` enabled DNS caching. I corrected it to describe reducing extra search-domain queries.
- The StatefulSet example set `CGO_ENABLED` at runtime. That environment variable affects Go builds, not a prebuilt Collector container's runtime behavior, so I removed it.
- The memory limiter comments misstated the meaning of `limit_mib` and `spike_limit_mib`. I corrected them to describe the hard limit and the derived soft limit.
- The minimal Collector configuration referenced an `otlp` exporter in the pipeline but did not define one. I added an `exporters.otlp` section.
- The health check configuration used `check_collector_pipeline`, which the upstream extension README warns is not working as expected. I removed that optional setting from the example.
- The DNS cache sidecar snippet put `dnsPolicy` and `dnsConfig` under a container, but Kubernetes defines them at the pod spec level. I moved them to the pod spec and removed `shareProcessNamespace`, which shares process visibility rather than networking.
- The DNS cache sidecar used an explicit upstream DNS server but did not prevent dnsmasq from reading resolver configuration. I added `--no-resolv`.
- The resource limit example said Kubernetes would throttle to the request after startup. I corrected the comment because Kubernetes enforces CPU limits whenever the container tries to exceed the configured limit.

## Review Notes
- The examples still use `otel/opentelemetry-collector-contrib:0.93.0`, which is old relative to the current Collector release stream. The corrected examples avoid known deprecated fields, but readers should validate against the exact Collector version they deploy.
- `kubectl` was not available in the local environment, so kubectl command validation was done against the official Kubernetes command reference rather than local `kubectl --help` output.

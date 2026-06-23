# Validation Summary: Using eBPF with OpenTelemetry: Zero-Code Auto-Instrumentation

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- eBPF
- OpenTelemetry and OTLP
- OpenTelemetry Collector
- Grafana Beyla / OpenTelemetry eBPF Instrumentation
- Odigos
- Pixie
- Kubernetes
- Go OpenTelemetry manual instrumentation

## Sources Consulted
- OpenTelemetry eBPF Instrumentation docs: https://opentelemetry.io/docs/zero-code/obi/
- OpenTelemetry Go instrumentation docs: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Collector exporter docs: https://opentelemetry.io/docs/collector/components/exporter/
- Grafana Beyla configuration docs: https://grafana.com/docs/beyla/latest/configure/options/
- Grafana Beyla export data docs: https://grafana.com/docs/beyla/latest/configure/export-data/
- Grafana Beyla Kubernetes deployment docs: https://grafana.com/docs/beyla/latest/setup/kubernetes/
- Grafana Beyla routes decorator docs: https://grafana.com/docs/beyla/latest/configure/routes-decorator/
- Grafana Beyla distributed tracing docs: https://grafana.com/docs/beyla/latest/distributed-traces/
- Grafana Beyla exported metrics docs: https://grafana.com/docs/beyla/latest/metrics/
- Grafana Beyla performance overhead docs: https://grafana.com/docs/beyla/latest/performance/
- Odigos installation docs: https://docs.odigos.io/oss/setup/installation
- Odigos CLI reference: https://docs.odigos.io/oss/cli/odigos_install and https://docs.odigos.io/oss/cli/odigos_sources_create
- Odigos OneUptime destination docs: https://docs.odigos.io/oss/backends/oneuptime
- Odigos Go eBPF instrumentation docs: https://docs.odigos.io/oss/instrumentations/golang/ebpf
- Pixie OpenTelemetry export docs: https://docs.px.dev/tutorials/integrations/otel/
- GitHub release metadata for Grafana Beyla and Odigos CLI release asset names.

## Issues Found
- The generic DaemonSet example had a selector without matching pod template labels and described `hostNetwork` as required. Added matching labels and removed the unsupported blanket `hostNetwork` requirement.
- The sidecar example omitted `shareProcessNamespace: true`, which is required for a Beyla-style sidecar to access the application process. Added it.
- The Beyla release download URL used an asset name that does not exist in current releases. Updated the command to resolve the latest tag and download the versioned Linux amd64 tarball.
- The Beyla sampling examples used `traces.sampler`, but current Beyla configuration uses `otel_traces_export.sampler`. Updated all examples and merged the sampler into the existing `otel_traces_export` block.
- The Beyla route filtering examples used `routes.ignored`; current Beyla uses `routes.ignored_patterns`. Updated both examples.
- The Odigos Homebrew tap and Linux binary download command were outdated. Updated Homebrew to `odigos-io/odigos-cli/odigos` and changed the Linux download to the current versioned tarball asset format.
- The Odigos examples used `odigos destination add` and `odigos instrument`, which are not current documented CLI commands. Replaced them with `odigos ui`/`kubectl apply` destination guidance and `odigos sources create` examples.
- The Go manual instrumentation example called `span.End()` before `RecordError` and `SetStatus`, which prevents those updates from being recorded. Moved `span.End()` after error recording and added error recording for the save span.
- The "automatically captured" and eBPF visibility tables overclaimed some network and TLS details. Narrowed wording to supported HTTP/gRPC, memory-management syscalls, and tool-dependent TLS/HTTPS support.
- The overhead guidance said low sampling rate increases export volume. Corrected it to high sampling rate and changed the high-volume mitigation to lowering the sampling ratio.
- The conclusion claimed universal coverage for any application and language. Narrowed it to broad coverage across supported applications and languages.

## Review Notes
The post is technically correct after the edits. Some operational numbers, especially overhead and memory use, remain workload-dependent estimates and should be rechecked when the post is updated for a specific Beyla, Odigos, or Pixie release.

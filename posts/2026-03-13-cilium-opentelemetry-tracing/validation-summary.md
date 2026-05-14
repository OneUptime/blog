# Validation Summary: Cilium Tracing with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- OpenTelemetry Collector
- OTLP
- Jaeger / Grafana Tempo
- Helm

## Sources Consulted
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble exporter documentation: https://docs.cilium.io/en/stable/observability/hubble/configuration/export.html
- Cilium Hubble overview documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Hubble OpenTelemetry adapter repository README: https://github.com/cilium/hubble-otel
- Hubble OpenTelemetry adapter developer guide and source: https://github.com/cilium/hubble-otel/blob/master/DEV_GUIDE.md
- Hubble OpenTelemetry adapter KIND guide: https://github.com/cilium/hubble-otel/blob/master/USER_GUIDE_KIND.md
- OpenTelemetry Collector Kubernetes installation documentation: https://opentelemetry.io/docs/collector/install/kubernetes/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector troubleshooting / zPages documentation: https://opentelemetry.io/docs/collector/troubleshooting/

## Issues Found
- The post described Hubble OpenTelemetry export as if it were a current supported Cilium feature. The `cilium/hubble-otel` repository is archived and unmaintained, so the post now identifies it as an experimental archived adapter and cautions readers accordingly.
- The Cilium Helm values used `hubble.export.target.type` and `hubble.export.target.filePath`, which do not match current Cilium Hubble exporter values. Since the adapter reads from the Hubble API/socket rather than the file exporter, the command was simplified to enabling Hubble.
- The OpenTelemetry Collector Deployment mounted config at `/etc/otel` but did not pass `--config=/etc/otel/config.yaml`. Added the collector config argument.
- The collector snippet used the deprecated/removed `logging` exporter and `loglevel` setting. Replaced it with the current `debug` exporter and `verbosity: detailed`.
- The collector validation step used zPages on port `55679`, but the collector config did not enable the `zpages` extension or expose the port. Added the zPages extension, service entry, and container port.
- The OTLP gRPC exporter endpoint included an `http://` URL for a gRPC exporter. Updated it to a Kubernetes DNS name and port.
- The Hubble OTel DaemonSet had a selector but no matching pod template labels, making the manifest invalid. Added matching labels.
- The Hubble OTel image used `latest`, and the command-line flags did not match the standalone adapter source. Pinned the image to `ghcr.io/cilium/hubble-otel:v0.1.1` and replaced the args with `--hubble.address`, `--otlp.address`, `--logs.export=false`, and `--trace.export=true`.
- The collector Service was missing, so `otel-collector.monitoring.svc.cluster.local:4317` would not resolve. Added a Service exposing OTLP and zPages.
- The post told readers to look for hard-coded `service.name` values of `cilium` or `hubble`, which is not guaranteed by the adapter. Reworded the validation guidance to look for services and spans generated from Hubble flow metadata.

## Review Notes
The corrected post is technically coherent as an experimental pattern, but the adapter is archived and built on old OpenTelemetry Collector/Cilium dependencies. For production use, readers should prefer currently maintained Cilium observability outputs, such as Hubble metrics, Hubble flow logs, or a maintained custom integration.

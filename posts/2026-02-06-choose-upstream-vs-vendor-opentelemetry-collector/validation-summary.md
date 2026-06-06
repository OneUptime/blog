# Validation Summary: How to Choose Between Upstream and Vendor OpenTelemetry Collector Distributions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Core and Contrib distributions
- OpenTelemetry Collector Builder (ocb)
- Collector YAML configuration
- Grafana Alloy configuration
- AWS Distro for OpenTelemetry (ADOT)
- Splunk, Elastic EDOT, Datadog DDOT, New Relic NRDOT, and Dynatrace Collector distributions
- OTLP, Prometheus, AWS S3, AWS X-Ray, Kafka, and related Collector components

## Sources Consulted
- OpenTelemetry Collector distributions documentation: https://opentelemetry.io/docs/collector/distributions/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporter registry: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Builder README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/cmd/builder/README.md
- OpenTelemetry Collector Core distribution manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol/manifest.yaml
- OpenTelemetry Collector Contrib AWS S3 exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awss3exporter/README.md
- Grafana Alloy OTLP receiver documentation: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.receiver.otlp/
- Grafana Alloy OTLP HTTP exporter documentation: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlphttp/
- AWS EKS add-ons documentation for ADOT: https://docs.aws.amazon.com/eks/latest/userguide/workloads-add-ons-available-eks.html
- Elastic EDOT Collector documentation: https://www.elastic.co/docs/reference/edot-collector
- Splunk OpenTelemetry Collector installation documentation: https://help.splunk.com/en?resourceId=gdi_opentelemetry_collector-windows_install-windows
- Datadog OpenTelemetry overview and DDOT references: https://opensource.datadoghq.com/projects/opentelemetry/
- New Relic NRDOT Collector documentation: https://docs.newrelic.com/docs/opentelemetry/nrdot/nrdot-collector/
- Dynatrace Collector documentation: https://docs.dynatrace.com/docs/extend-dynatrace/opentelemetry/collector/

## Issues Found
- The post described Upstream Core as only OTLP, basic processors, and a few extensions. The current official core distribution manifest includes additional common components such as Prometheus, Kafka, Jaeger, Zipkin, file, health check, and pprof components. Updated the description to reflect that core is curated and smaller than contrib, but not only OTLP.
- The post listed "logging and debug exporters" in core. The logging exporter has been replaced by the debug exporter in current Collector releases. Updated this to "Debug and file exporters."
- The comparison matrix said upstream core has no Prometheus support. Current OpenTelemetry component docs and the core manifest include Prometheus receiver/exporter components. Updated the row to "Prometheus components" and marked core and contrib as receiver/exporter.
- The post said upstream releases happen monthly. Recent official Collector releases are more frequent, roughly every two weeks. Updated the wording to avoid an inaccurate fixed cadence.
- The single-vendor example used `vendor_specific_exporter`, which is not a real Collector component. Replaced it with a generic `otlphttp/vendor` example using a documented Collector exporter pattern.
- The AWS S3 exporter example omitted a prefix, which is not strictly required but is part of the official examples and makes the archive layout explicit. Added `s3_prefix: traces`.
- The custom Collector Builder example used old `v0.96.0` component versions and omitted config providers. Updated it to current `v0.153.0` Collector component versions, added a module name, and included current config providers matching the official builder examples.
- The final migration guidance said migration is usually just changing the container image. That was too broad because component names, options, and vendor defaults can differ. Updated the sentence to call out those checks.

## Review Notes
The vendor lag values and distribution feature matrix are broad guidance rather than version-pinned facts. They are acceptable for a decision guide, but future updates should verify each vendor distribution's current component manifest and support scope at publication time.

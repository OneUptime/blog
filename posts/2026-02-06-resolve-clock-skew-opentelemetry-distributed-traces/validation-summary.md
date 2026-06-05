# Validation Summary: How to Resolve Clock Skew Issues in OpenTelemetry Distributed Traces

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry distributed tracing
- OpenTelemetry Collector transform processor
- Jaeger query service clock skew adjustment
- NTP, chrony, ntpd, and systemd-timesyncd
- Kubernetes DaemonSets and Linux host namespaces
- AWS Amazon Time Sync Service
- Google Compute Engine NTP
- Prometheus node_exporter and alerting rules
- JavaScript and Python monotonic clocks

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Collector processor docs: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transform processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- Jaeger deployment docs for clock skew adjustment: https://www.jaegertracing.io/docs/latest/deployment/
- systemd timedatectl documentation: https://www.freedesktop.org/software/systemd/man/latest/timedatectl.html
- chrony documentation: https://chrony-project.org/documentation.html
- AWS EC2 Amazon Time Sync Service docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-time-sync.html
- Google Compute Engine NTP docs: https://docs.cloud.google.com/compute/docs/instances/time-synchronization/configure-ntp
- Prometheus node_exporter docs: https://github.com/prometheus/node_exporter

## Issues Found
- The clock skew diagram explanation had the direction of skew reversed. The example showed Service B timestamps behind Service A, so the text was corrected from "Service B's clock is running ahead" to "running behind."
- The Kubernetes DaemonSet claimed to run chrony on every node, but the snippet only installed chrony inside a container and queried a container-local daemon that would usually not exist. The example was changed to a host-level sync checker that uses `nsenter` to query the node's time sync state.
- The post overstated tracing backend support by saying most backends have clock skew correction. This was narrowed to "some tracing backends," while keeping the Jaeger-specific example.
- The OpenTelemetry Collector example said it detected and logged clock skew, but the transform processor snippet only added metadata. The wording and configuration were corrected to describe span enrichment for correlation, and a missing OTLP receiver was added.
- The JavaScript OpenTelemetry example used numeric status codes. It was updated to import and use `SpanStatusCode.OK` and `SpanStatusCode.ERROR`, matching the current documented API style.
- The monitoring section referred to node_exporter metrics as NTP metrics. This was clarified as Linux kernel time synchronization metrics from node_exporter's timex collector.

## Review Notes
The guide is technically sound after correction. The trace-data Python detector is intentionally simplified and assumes a flat JSON export with `spanId`, `parentSpanId`, and `startTimeUnixNano` fields; a production detector would need to account for the exact export format and service/resource attribute layout.

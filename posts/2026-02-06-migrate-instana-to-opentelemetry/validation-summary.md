# Validation Summary: How to Migrate from Instana to OpenTelemetry

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- IBM Instana
- OpenTelemetry Java agent
- OpenTelemetry JavaScript / Node.js SDK
- OpenTelemetry Python zero-code instrumentation
- OpenTelemetry Collector
- OTLP gRPC and OTLP HTTP
- Kubernetes DaemonSet
- Helm
- OneUptime OTLP ingestion

## Sources Consulted
- IBM Instana Linux host agent uninstall documentation: https://www.ibm.com/docs/en/instana-observability?topic=linux-uninstalling-agent
- IBM Instana Node.js collector installation and configuration documentation: https://www.ibm.com/docs/en/instana-observability?topic=nodejs-collector-installation and https://www.ibm.com/docs/en/instana-observability?topic=nodejs-collector-configuration
- IBM Instana Python monitoring documentation: https://www.ibm.com/docs/en/instana-observability?topic=technologies-monitoring-python
- OpenTelemetry Java SDK and Java agent configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry JavaScript instrumentation and resources documentation: https://opentelemetry.io/docs/languages/js/instrumentation/ and https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Python zero-code instrumentation and manual instrumentation documentation: https://opentelemetry.io/docs/zero-code/python/ and https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Collector hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OneUptime OpenTelemetry ingestion documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- Helm uninstall command documentation: https://helm.sh/docs/helm/helm_uninstall/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The Instana Linux uninstall commands used fixed package names. IBM documents that users should find the installed Instana package name first and then purge/remove that package. Updated the Debian and RHEL examples accordingly.
- The Kubernetes removal sequence deleted the namespace before uninstalling the Helm release, which would make `helm uninstall -n instana-agent` fail. Reordered the commands so Helm uninstall happens before deleting the namespace.
- The Java agent examples sent to port 4317 without setting the OTLP protocol. Current OpenTelemetry Java agent 2.x defaults to `http/protobuf`, so port 4317 requires `grpc` to be explicit. Added `otel.exporter.otlp.protocol=grpc` and `OTEL_EXPORTER_OTLP_PROTOCOL=grpc`.
- The Node.js section described Instana as host-agent sensor injection for Node.js. IBM documents the `@instana/collector` package and AutoTrace webhook model, so the wording and comments were corrected.
- The Node.js example used `new Resource(...)`, which is not the current OpenTelemetry JS resources API. Updated it to `resourceFromAttributes(...)`.
- The Collector example used the `otlp` gRPC exporter with OneUptime's `/otlp` endpoint. OneUptime's Collector documentation uses `otlphttp` with JSON encoding and the `x-oneuptime-token` header. Updated the exporter and pipeline references.
- The hostmetrics receiver was shown in a Kubernetes DaemonSet without mounting the host filesystem. The hostmetrics receiver documentation requires mounting the host filesystem and setting `root_path` when collecting host metrics from inside a container. Added `root_path: /hostfs` and a read-only hostPath mount.
- The Python manual span example used `trace.Status` and `trace.StatusCode` indirectly. Updated it to import `Status` and `StatusCode` from `opentelemetry.trace`, matching the official documentation.

## Review Notes
- The Collector DaemonSet remains a minimal example and assumes the `observability` namespace and `otel-collector-config` ConfigMap are created separately.
- The Java, Node.js, and Python examples intentionally use OTLP/gRPC to the local Collector on port 4317. If using OTLP/HTTP directly from SDKs, the endpoint and protocol settings should be changed to the HTTP receiver on port 4318.

# Validation Summary: How to Set Up Ingestion Keys and Hostname Configuration

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Mezmo exporter
- OpenTelemetry Collector resource detection, resource, Kubernetes attributes, transform, batch, OTLP, and filelog components
- Mezmo ingestion keys and Log Analysis API
- Kubernetes Secrets and Downward API environment variables
- curl

## Sources Consulted
- Mezmo OpenTelemetry Exporter documentation: https://docs.mezmo.com/docs/opentelemetry-exporter
- Mezmo Ingestion Keys documentation: https://docs.mezmo.com/docs/ingestion-key
- Mezmo Log Analysis API key endpoints: https://docs.mezmo.com/log-analysis-api
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib Mezmo exporter README and source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/mezmoexporter
- OpenTelemetry Collector Contrib resource detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor
- OpenTelemetry Collector Contrib resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourceprocessor
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Kubernetes attributes processor documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The API example used `POST /v1/config/ingestion`, but Mezmo documents key creation at `POST /v1/config/keys` with `type=ingestion`. Updated the endpoint and request body.
- The API example used deprecated service-key Basic authentication. Updated it to use `Authorization: Token ${MZM_ACCESS_KEY}`, matching Mezmo's IAM access-key guidance.
- The hostname snippets set `mezmo.hostname`, but the Mezmo exporter reads the resource attribute `host.name` and sends it as Mezmo `hostname`. Updated the resource processor examples to set `host.name`.
- The app-name mapping used `mezmo.app`, but the exporter reads the log attribute `appname`. Updated the complete configuration to set `log.attributes["appname"]` with the transform processor.
- The resource detection snippets used the deprecated `resourcedetection` component alias. Updated examples to `resource_detection`.
- The OTLP HTTP test sent logs to port `4318`, but the complete Collector configuration only enabled OTLP gRPC on `4317`. Added the OTLP HTTP protocol endpoint.
- The troubleshooting curl used Basic auth against the Mezmo exporter ingest URL. The exporter sends the ingestion key in the `apikey` header, so the example now uses that header.
- The Kubernetes Deployment snippet omitted the required selector, matching pod labels, and namespace alignment with the Secret. Added those fields so the manifest structure is valid for `apps/v1`.

## Review Notes
The complete Collector configuration was validated with `otelcol-contrib v0.153.0`. The Kubernetes `filelog` and `k8sattributes` combination may still require deployment-specific pod association or file-path parsing in real clusters, depending on how logs arrive at the Collector.

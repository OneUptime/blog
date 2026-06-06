# Validation Summary: How to Configure the Datadog Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Datadog exporter for the OpenTelemetry Collector
- Datadog APM, metrics, logs, and host metadata
- OTLP receiver
- OpenTelemetry Collector processors: batch, resource, transform, resourcedetection, filter, memory_limiter, probabilistic_sampler, tail_sampling

## Sources Consulted
- Datadog documentation: Set Up the OpenTelemetry Collector - https://docs.datadoghq.com/opentelemetry/setup/collector_exporter/install/
- OpenTelemetry Collector Contrib Datadog exporter README - https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/datadogexporter
- OpenTelemetry Collector Contrib Datadog exporter generated configuration schema - https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/datadog/config/config.schema.yaml
- OpenTelemetry Collector Contrib Datadog exporter config source - https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/datadog/config
- OpenTelemetry Collector internal telemetry documentation - https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The basic exporter example placed `site` at the exporter root. The Datadog exporter schema defines `site` under `api`, so the example was corrected to `api.site`.
- The examples used older environment substitution such as `${DD_API_KEY}` and `${HOSTNAME}`. Current Collector examples use `${env:DD_API_KEY}` style substitution, so all Datadog API key and hostname references were updated.
- Several examples used top-level `tags`, which has been removed from the Datadog exporter in favor of `host_metadata.tags`. These blocks were changed to `host_metadata.tags` and their comments were narrowed to host metadata tags.
- The Datadog Agent proxy example configured metrics on `localhost:8125` and described DogStatsD protocol use. The Datadog exporter metrics endpoint is an HTTP Datadog intake endpoint, not DogStatsD, and the example only has a traces pipeline. The invalid metrics block and DogStatsD wording were removed.
- The Unified Service Tagging example used the attributes processor to map resource attributes, then configured `traces.resource_attributes_as_tags`, which is not a valid Datadog exporter trace setting. The example now uses the resource processor and relies on Datadog's resource attribute mapping for traces.
- The production example also used removed top-level `tags` and invalid `traces.resource_attributes_as_tags`; both were corrected.
- The production example used deprecated `service.telemetry.metrics.address`. It was updated to the current `service.telemetry.metrics.readers` Prometheus pull configuration.
- The regional examples omitted Datadog's AP2 site. An AP2 example using `ap2.datadoghq.com` was added.

## Review Notes
All YAML snippets parse successfully after the corrections. The examples are still illustrative and may require deployment-specific tuning for batch sizes, sampling policies, host metadata behavior, and Datadog intake limits.

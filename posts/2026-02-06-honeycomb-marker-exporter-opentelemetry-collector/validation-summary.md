# Validation Summary: How to Configure the Honeycomb Marker Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Honeycomb Marker exporter
- Honeycomb Markers API and environment markers
- OTLP/HTTP logs
- OTTL log conditions
- Collector attributes, batch, and Kubernetes attributes processors
- Collector Basic Auth extension
- Kubernetes Jobs
- GitHub Actions, Terraform, jq, curl

## Sources Consulted
- OpenTelemetry Collector Contrib Honeycomb Marker exporter documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/honeycombmarkerexporter
- OpenTelemetry Collector Contrib Honeycomb Marker exporter source/config: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/honeycombmarkerexporter
- Honeycomb marker management documentation: https://docs.honeycomb.io/configure/environments/manage-markers
- Honeycomb changelog announcing the Collector Marker exporter: https://changelog.honeycomb.io/honeycomb-marker-exporter-for-the-opentelemetry-collector-280266
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector Kubernetes attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Collector Basic Auth extension documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/basicauthextension
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The post used unsupported Honeycomb Marker exporter fields such as `marker_type`, `message_template`, `url_template`, and exporter-level `metadata`. Replaced these with the documented `markers` list using `type`, `dataset_slug`, `message_key`, `url_key`, and `rules.log_conditions`.
- The post implied the exporter could format marker messages from templates. The exporter reads marker message and URL values from attributes named by `message_key` and `url_key`, so the examples now send preformatted `marker_message` and `marker_url` attributes.
- The multi-marker examples used a routing processor to select separate exporters. The exporter natively supports multiple marker definitions with OTTL log conditions, so the examples now use one exporter with multiple `markers` entries where appropriate.
- Environment variable references used `${HONEYCOMB_API_KEY}`. Updated Collector examples to the current `${env:HONEYCOMB_API_KEY}` provider syntax.
- The examples inserted a `${NOW}` timestamp attribute, which is not a valid Collector configuration value. Removed that action and relied on OTLP `timeUnixNano` from the log records.
- Kubernetes examples referenced `k8s.cluster.name`, which is not a documented k8sattributes metadata key. Replaced it with documented Kubernetes attributes.
- Incident and feature flag examples used nested webhook field paths in the attributes processor, which only copies existing attributes by key and does not parse nested JSON bodies. Updated those sections to require preformatted marker attributes from the webhook integration.
- Basic Auth configuration used `basicauth` as the authenticator instance. Updated it to the documented `basicauth/server` extension instance pattern.
- Collector internal telemetry examples set `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Removed the ignored setting and kept the supported `metrics.level` option.
- Troubleshooting text referenced template errors. Updated it to discuss OTTL condition errors and missing marker attributes instead.

## Review Notes
The Honeycomb Marker exporter is alpha for logs and is available in the Collector contrib distribution. The corrected examples are YAML-syntax valid, but the local workspace did not include an `otelcol-contrib` binary, so full Collector startup validation was performed against official documentation rather than a local `--dry-run` command.

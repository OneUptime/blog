# Validation Summary: How to Use the OpenTelemetry GeoIP Processor to Flag Requests from Suspicious

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry GeoIP processor
- OpenTelemetry Transform processor and OTTL
- OpenTelemetry Routing connector
- MaxMind GeoLite2/GeoIP2 databases and geoipupdate
- OpenTelemetry Python with Flask
- Prometheus alert rules
- Kubernetes CronJob

## Sources Consulted
- OpenTelemetry Collector GeoIP processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/geoipprocessor/README.md
- OpenTelemetry Collector MaxMind GeoIP provider README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/geoipprocessor/internal/provider/maxmindprovider/README.md
- OpenTelemetry Collector Transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry semantic conventions for client/source attributes: https://github.com/open-telemetry/semantic-conventions/blob/main/docs/general/attributes.md
- OpenTelemetry semantic conventions for geo attributes: https://github.com/open-telemetry/semantic-conventions/blob/main/model/geo/registry.yaml
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Flask instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- MaxMind download/update documentation: https://support.maxmind.com/hc/en-us/articles/4408216129947-Download-and-Update-Databases and https://maxmind.github.io/geoipupdate/

## Issues Found
- The GeoIP processor configuration used `source_attribute`, but the current contrib processor uses an `attributes` array. Changed the example to `attributes: ["client.address"]`.
- The GeoIP processor was configured with `context: resource` while the application example sets `client.address` on spans. Changed the example to `context: record` so span and log record attributes are enriched.
- The transform processor checked `geo.country_iso_code`, but the current GeoIP processor emits `geo.country.iso_code`. Updated all country checks to the correct attribute name.
- The routing connector example mixed `statement`, `condition`, and an unwired connector. Replaced it with trace and log routing connectors that use the appropriate `span` and `log` contexts, then added them as exporters from the main pipelines and receivers for the alert pipelines.
- The PromQL alert wording implied the Collector snippet directly exported enriched request metrics. Clarified that the PromQL example assumes span- or log-derived metrics with the GeoIP attributes converted to Prometheus labels.
- Clarified that log enrichment requires the same client IP attribute to be present on logs, since the Python example only sets it on spans.

## Review Notes
The GeoIP processor is currently alpha in the OpenTelemetry Collector Contrib distribution, so configuration details may change in future Collector releases. The corrected Markdown YAML blocks and Python code block were parsed locally.

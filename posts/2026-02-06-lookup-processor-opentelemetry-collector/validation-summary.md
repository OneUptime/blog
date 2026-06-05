# Validation Summary: How to Configure the Lookup Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Lookup processor
- OpenTelemetry Transformation Language (OTTL)
- Collector YAML configuration
- YAML lookup sources
- DNS PTR lookup source
- Filter, resource, and batch processors

## Sources Consulted
- OpenTelemetry Collector processor component list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector Contrib Lookup processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/processor/lookupprocessor
- Lookup processor configuration schema: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.153.0/processor/lookupprocessor/config.schema.yaml
- Lookup processor metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.153.0/processor/lookupprocessor/metadata.yaml
- Lookup processor YAML source README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.153.0/processor/lookupprocessor/internal/source/yaml/README.md
- Lookup processor DNS source README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.153.0/processor/lookupprocessor/internal/source/dns/README.md

## Issues Found
- The original post described the Lookup processor as if it supported traces, spans, metrics, and logs. The official metadata and README list the processor as development-status for logs only, with metrics and traces planned. I updated the post to use log pipelines and log/resource attribute paths.
- The original configuration schema was incorrect. Fields such as `lookup_table`, `tables`, `csv_file`, `json_file`, `attribute`, `table`, `source: csv_file`, `flatten`, `prefix`, `condition`, `reload_interval`, `max_entries`, `add_match_flag`, and `match_flag_attribute` are not documented Lookup processor fields. I replaced the examples with the documented `source`, `source.type`, `source.path`, `lookups`, `key`, and `attributes` structure.
- The original post claimed built-in CSV, JSON, environment-variable, dynamic reload, nested JSON flattening, and match-flag support. The official built-in sources are `noop`, `yaml`, and `dns`; the YAML source loads once at startup, and the DNS source performs PTR lookups with caching. I replaced unsupported sections with YAML and DNS examples and clarified the startup-loading behavior.
- The original examples matched `service.name` as a span attribute. In OpenTelemetry data, `service.name` is commonly a resource attribute, and the Lookup processor examples use OTTL expressions. I changed examples to use `resource.attributes["service.name"]` where appropriate and `log.attributes[...]` for log-record attributes.
- The original post implied the processor was generally available in normal Collector distributions. Official metadata lists no distributions for the Lookup processor. I added a caveat that users need a Collector build that includes the processor.

## Review Notes
The processor is still in development status, so its configuration and distribution availability may change. Future reviews should re-check the current OpenTelemetry Collector Contrib README and schema before relying on these examples.

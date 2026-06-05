# Validation Summary: How to Send OpenTelemetry Data to Coralogix Using the Coralogix Exporter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Coralogix exporter
- Coralogix application and subsystem labels
- OpenTelemetry Collector resource and batch processors
- OpenTelemetry JavaScript SDK for Node.js
- OTLP gRPC exporter for JavaScript

## Sources Consulted
- OpenTelemetry Collector Contrib Coralogix exporter documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/coralogixexporter
- Coralogix OpenTelemetry Collector EC2 installation and exporter configuration documentation: https://coralogix.com/docs/opentelemetry/configuration-options/install-opentelemetry-on-an-ec2-instance/
- Coralogix quick reference for current region domains: https://coralogix.com/docs/user-guides/getting-started/quick-reference/
- OpenTelemetry Collector configuration documentation for environment variable expansion: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/

## Issues Found
- The Collector examples used `"${CORALOGIX_PRIVATE_KEY}"` for environment variable substitution. Current OpenTelemetry Collector documentation uses the `${env:NAME}` form, so I changed the examples to `"${env:CORALOGIX_PRIVATE_KEY}"`.
- The main Collector example configured both `domain` and hardcoded per-signal `ingress.coralogix.com:443` endpoints. Current Coralogix exporter documentation supports region selection through `domain`, and hardcoded signal endpoints can route data to the wrong region, so I removed the per-signal endpoint overrides from the domain-based example.
- The region list used older or incorrect domain values such as `coralogix.us`, `coralogix.in`, and `coralogixsg.com`. I updated the examples to the current Coralogix domain values: `us1.coralogix.com`, `us2.coralogix.com`, `eu1.coralogix.com`, `eu2.coralogix.com`, `ap1.coralogix.com`, and `ap2.coralogix.com`.
- The Node.js SDK example imported and instantiated `Resource` directly from `@opentelemetry/resources`. Current OpenTelemetry JavaScript documentation uses `resourceFromAttributes()`, so I updated the example accordingly.
- The dynamic label assignment section said to use the resource processor with conditions, but the snippet only demonstrated `insert` semantics. I changed the wording to accurately describe setting defaults without overwriting existing service-provided attributes.

## Review Notes
The Coralogix exporter supports `application_name_attributes` and `subsystem_name_attributes` as ordered resource attribute lists, using the first non-empty value and falling back to `application_name` and `subsystem_name` when needed. The retry and sending queue configuration matches the OpenTelemetry exporter helper configuration pattern.

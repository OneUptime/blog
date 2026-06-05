# Validation Summary: How to Build an Internal OpenTelemetry Developer Portal with Self-Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Node.js auto-instrumentation
- OpenTelemetry OTLP HTTP trace exporter
- OpenTelemetry Collector configuration
- Bash scripting
- GitHub Actions
- Docker Compose
- Node.js / Express template structure

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript instrumentation libraries documentation: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- npm package metadata for current OpenTelemetry JavaScript package versions: https://www.npmjs.com/package/@opentelemetry/sdk-node

## Issues Found
- The Node.js example used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JavaScript packages no longer expose `Resource` as a usable constructor. Changed the import and resource creation to use `resourceFromAttributes(...)`, which matches the current official documentation.
- The listed OpenTelemetry package versions were outdated for the current packages reviewed. Updated the dependency versions to the current npm versions checked during validation.
- The GitHub Actions example ran `npm install` in a directory containing `package.json.template`, not `package.json`. Updated the workflow command to copy `package.json.template` to `package.json` before installing.
- The GitHub Actions smoke test used `node -e "require('./tracing')"`, which starts the OpenTelemetry SDK and may not exit on its own. Updated the test command to set a service name, use a closed local OTLP endpoint, and send `SIGTERM` so the graceful shutdown path is exercised.

## Review Notes
The Collector configuration generator is syntactically valid Bash and uses Collector components and exporter names that are current in the official Collector documentation. The OTLP endpoint behavior described in the Node.js comments is consistent with the OTLP exporter specification for base endpoints and `/v1/traces` paths.

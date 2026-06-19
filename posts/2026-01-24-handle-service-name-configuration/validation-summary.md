# Validation Summary: How to Handle Service Name Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry resource attributes
- OpenTelemetry SDK environment variables
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Python SDK
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK for Node.js documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript SDK 2.x migration guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry deployment environment semantic convention: https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/
- OpenTelemetry Python resources documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/resources.html
- OpenTelemetry Python environment variables documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/environment_variables.html

## Issues Found
- The configuration methods section claimed all methods were listed in a single order of precedence, with programmatic configuration first. Current OpenTelemetry documentation explicitly defines `OTEL_SERVICE_NAME` precedence over `service.name` in `OTEL_RESOURCE_ATTRIBUTES`, and the JavaScript resource documentation notes environment values can take precedence over code-provided resource values. Changed the wording to list configuration methods without a universal precedence claim and added the documented `OTEL_SERVICE_NAME` precedence rule.
- The Node.js example used `new Resource(...)` and `SemanticResourceAttributes`, which are outdated for current OpenTelemetry JavaScript documentation. Updated it to use `resourceFromAttributes` from `@opentelemetry/resources` and `ATTR_*` constants from `@opentelemetry/semantic-conventions`.
- The post used the deprecated `deployment.environment` resource attribute. Updated examples and guidance to use the stable `deployment.environment.name` semantic convention.
- The Python snippet called `os.getenv` without importing `os`. Added the missing import.

## Review Notes
Service naming guidance such as lowercase, concise, organization-wide names is sound as best-practice guidance, but exact naming conventions are organizational rather than strictly mandated by the OpenTelemetry specification.

# Validation Summary: How to Use OpenTelemetry in a Monorepo with Shared SDK Config Across Multi

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry OTLP HTTP trace exporter
- OpenTelemetry Node auto-instrumentations
- npm workspaces
- CommonJS JavaScript
- Express

## Sources Consulted
- OpenTelemetry JavaScript SDK for Node.js API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript instrumentation libraries guide: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry JavaScript resources API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry semantic conventions package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry deployment resource attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry service resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- npm workspaces documentation: https://docs.npmjs.com/cli/v10/using-npm/workspaces/
- npm registry metadata for the referenced OpenTelemetry packages, checked with `npm view`

## Issues Found
- The dependency versions were pinned to older OpenTelemetry JavaScript packages. Updated the package example to current published versions checked on June 5, 2026.
- The initialization example imported unused metrics exporter and metric reader classes. Removed those imports and the unused metrics exporter dependency so the tracing package example matches what the code actually configures.
- The resource example used `new Resource(...)`. Current OpenTelemetry JavaScript documentation shows resources are created with `resourceFromAttributes()`, so the example was updated.
- The resource example used the deprecated `deployment.environment` attribute. Updated it to the stable `deployment.environment.name` semantic convention via `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`.
- The configuration exposed `http`, `express`, and `grpc` instrumentation toggles but only applied `pg` and `redis`. Added the missing disable rules so service overrides behave as described.

## Review Notes
- `@opentelemetry/sdk-node` remains an experimental package under active development, so examples that pin this package should be revisited periodically.
- The example still focuses on shared tracing configuration. Metrics are intentionally not configured after removing the unused metrics imports.

# Validation Summary: How to configure OpenTelemetry auto-instrumentation with Node.js

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Node auto-instrumentation
- Express
- Fastify
- MySQL, PostgreSQL, MongoDB, and Redis instrumentation
- OTLP gRPC trace export
- Node.js preload flags and `NODE_OPTIONS`
- Docker and Docker Compose deployment

## Sources Consulted
- OpenTelemetry JavaScript Node.js getting started: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry `@opentelemetry/resources` API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry auto-instrumentations-node package documentation: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/auto-instrumentations-node
- OpenTelemetry MongoDB instrumentation types: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-mongodb
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Node.js CLI documentation for `--require`, `--import`, and `NODE_OPTIONS`: https://nodejs.org/api/cli.html
- npm `ci` command documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- Docker Node.js containerization guide: https://docs.docker.com/guides/nodejs/containerize/

## Issues Found
- The main instrumentation example imported and instantiated `Resource` from `@opentelemetry/resources`. Current OpenTelemetry JS exports `Resource` as an interface/type and uses `resourceFromAttributes()` to create resources, so the example would fail at runtime with current packages. Updated it to use `resourceFromAttributes()`.
- The main instrumentation example used deprecated `SemanticResourceAttributes` constants. Updated stable service attributes to `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`, and used the incubating `ATTR_DEPLOYMENT_ENVIRONMENT` export for `deployment.environment`.
- The install command omitted direct dependencies used by the examples, including `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, and individual instrumentation packages imported in the custom configuration example. Added those packages to keep copied examples reliable with package managers that do not expose transitive dependencies.
- The explanation said the SDK intercepts both `require()` and `import` calls without qualification. Clarified that CommonJS `require()` is covered by the shown `--require` setup, while ESM needs the Node ESM loader/import setup.
- The MongoDB `responseHook` example read `result.result`; current MongoDB instrumentation passes a `responseInfo` object with `responseInfo.data.result`. Updated the hook accordingly.
- The Dockerfile used `npm ci --only=production`. Updated it to `npm ci --omit=dev`, which is the current documented form.
- The troubleshooting section suggested `curl http://localhost:4317` for an OTLP/gRPC endpoint. Port 4317 is gRPC, so an HTTP curl check is misleading. Replaced it with `nc -vz localhost 4317` to test TCP reachability.

## Review Notes
- The post is technically relevant and contains implementation guidance, so it was reviewed as a code tutorial.
- JavaScript code blocks were syntax-checked with `node --check`.
- The updated main instrumentation snippet was smoke-tested against current OpenTelemetry packages.
- Fastify's contrib instrumentation has had deprecation/removal churn in recent OpenTelemetry JS contrib releases in favor of `@fastify/otel`; future revisions should revisit the Fastify section if the bundled instrumentation list changes further.

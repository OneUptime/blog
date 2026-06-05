# Validation Summary: How to Set Up OpenTelemetry for Local Development with Hot Reloading

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Node.js auto-instrumentation
- OpenTelemetry HTTP and Express instrumentation
- OTLP trace export over HTTP and gRPC
- Jaeger all-in-one
- Docker Compose
- Node.js process lifecycle and shutdown handlers
- nodemon
- Next.js instrumentation hook
- webpack Hot Module Replacement
- Jest-style integration testing
- Visual Studio Code Node.js launch configurations
- autocannon benchmarking

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters guide: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JS NodeSDK configuration API: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.NodeSDKConfiguration.html
- OpenTelemetry JS HTTP instrumentation API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-http.html
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Node.js process documentation: https://nodejs.org/api/process.html
- nodemon README: https://github.com/remy/nodemon
- Next.js instrumentation file convention: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
- webpack Hot Module Replacement API: https://webpack.js.org/api/hot-module-replacement/
- webpack HMR guide: https://webpack.js.org/guides/hot-module-replacement/

## Issues Found
- The console-exporter snippet used `ConsoleSpanExporter` from `@opentelemetry/sdk-trace-base` and referenced `OTLPTraceExporter` without importing it. Updated the snippet to import `ConsoleSpanExporter` from `@opentelemetry/sdk-trace-node` per current OpenTelemetry docs and added the missing OTLP HTTP exporter import.
- The production exporter example used a non-standard `OTEL_EXPORTER_URL` environment variable. Replaced it with the standard `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`.
- The Docker Compose examples used the legacy top-level `version: '3.8'` field and the old `docker-compose` command form. Removed the version field and updated commands to `docker compose`.
- The Jaeger examples used `latest` images. Pinned them to `jaegertracing/all-in-one:1.76.0` to match the current documented Jaeger release reviewed and avoid version drift in a technical tutorial.
- The shutdown snippet registered an async handler on Node's `exit` event, where async work is not reliable. Replaced it with signal handlers that await `sdk.shutdown()`, added nodemon's `SIGUSR2` restart pattern, and kept HMR cleanup via `module.hot.dispose`.
- The span processor snippet used the deprecated singular `spanProcessor` NodeSDK option and omitted the auto-instrumentation import. Updated it to `spanProcessors: [...]` and added the missing import.
- The HTTP instrumentation snippets used `ignoreIncomingPaths`, which is not a current documented option. Replaced it with `ignoreIncomingRequestHook`.
- The request-header trace control example attempted to mutate `spanContext().traceFlags` in `requestHook` after span creation. That does not make the SDK drop the span. Replaced it with `ignoreIncomingRequestHook`, which is the documented way to suppress incoming HTTP spans in that instrumentation.
- The Next.js TypeScript snippet referenced `NodeSDK` without importing it and used a JavaScript code fence. Added the import and changed the fence to TypeScript.
- The integration-test assertion only checked the older `http.status_code` semantic convention. Updated it to accept the stable `http.response.status_code` attribute while retaining compatibility with older emitted attributes.
- The benchmark script toggled `process.env.ENABLE_OTEL` and re-imported the same server module in one process, which would be affected by module caching and would not reliably compare initialized telemetry modes. Reworked it to spawn the server with the desired environment for each run.
- The full-stack Compose example exposed only the OTLP gRPC port while configuring services in a way that aligned better with OTLP HTTP examples elsewhere in the post. Added port `4318` and changed service environment variables to `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://jaeger:4318/v1/traces`.

## Review Notes
- The post is now technically valid as a Node.js-focused OpenTelemetry local development guide. Some snippets remain intentionally schematic, such as application-specific server entry points and placeholder telemetry configuration, but the API names, lifecycle patterns, and endpoint examples now align with the official documentation consulted.

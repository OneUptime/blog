# Validation Summary: How to Configure OpenTelemetry for Heroku Applications

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Protocol (OTLP) HTTP exporters
- Node.js CommonJS preload configuration
- Heroku dynos, Procfile, config vars, and Labs dyno metadata
- Distributed tracing, metrics export, auto-instrumentation, and custom spans

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JS TypeDoc for NodeSDK configuration: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.NodeSDKConfiguration.html
- OpenTelemetry JS TypeDoc for BatchSpanProcessor: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-base.BatchSpanProcessor.html
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry OTLP exporter environment variable specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Heroku Dyno Restarts: https://devcenter.heroku.com/articles/dyno-restarts
- Heroku Dyno Shutdown Behavior: https://devcenter.heroku.com/articles/dyno-shutdown-behavior
- Heroku Labs Dyno Metadata: https://devcenter.heroku.com/articles/dyno-metadata
- Heroku Procfile documentation: https://devcenter.heroku.com/articles/procfile
- Heroku Config Vars documentation: https://devcenter.heroku.com/articles/config-vars
- Heroku OpenTelemetry Signals and Attributes Reference: https://devcenter.heroku.com/articles/heroku-opentelemetry-signals-and-attributes-reference
- Node.js CLI options for `--require`: https://nodejs.org/api/cli.html

## Issues Found
- The post used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JavaScript packages do not export `Resource` as a constructible CommonJS API, and official examples use `resourceFromAttributes(...)`. Updated both resource examples.
- The post used `ATTR_DEPLOYMENT_ENVIRONMENT`, which is not exported by the current `@opentelemetry/semantic-conventions` package. Updated it to `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`, matching the current `deployment.environment.name` semantic convention.
- The post used `heroku.dyno_id` with `process.env.DYNO`. `DYNO` is the dyno name, and Heroku's current OpenTelemetry attribute reference uses `heroku.dyno.name`. Updated the attribute name.
- The custom span example used the numeric status code `2`. This works, but the current official JavaScript examples use `SpanStatusCode.ERROR`. Updated the example to import and use `SpanStatusCode`.
- The batch export section said the default BatchSpanProcessor delay was 30 seconds. Current OpenTelemetry JavaScript defaults `scheduledDelayMillis` to 5000 ms. Updated the text and example to describe setting the 5-second delay explicitly and wiring the custom processor through `spanProcessors`.
- The dyno metadata example used deprecated `HEROKU_SLUG_COMMIT` / `heroku.slug.commit`. Heroku documentation marks `HEROKU_SLUG_COMMIT` deprecated in favor of `HEROKU_BUILD_COMMIT`, which requires `runtime-dyno-build-metadata`. Updated the command and resource attribute example.

## Review Notes
The Heroku CLI was not installed locally, so Heroku commands were verified against official Heroku Dev Center documentation rather than local `heroku --help` output. The edited OpenTelemetry CommonJS imports and NodeSDK construction were also validated with the latest published OpenTelemetry packages in a temporary npm project.

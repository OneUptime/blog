# Validation Summary: How to Fix Express.js Instrumentation Failing Because the App Was Imported

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry NodeSDK
- OpenTelemetry Express instrumentation
- OpenTelemetry HTTP instrumentation
- Express.js
- Node.js CommonJS preloading with `--require`

## Sources Consulted
- OpenTelemetry JavaScript NodeSDK README: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- `@opentelemetry/resources` API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- `@opentelemetry/instrumentation-express` package README and type declarations from npm package version 0.66.0: https://www.npmjs.com/package/@opentelemetry/instrumentation-express
- Node.js command-line API documentation for `--require`: https://nodejs.org/api/cli.html

## Issues Found
- The resource setup example used `new Resource(...)` from `@opentelemetry/resources`. In the current `@opentelemetry/resources` 2.x API, `Resource` is exported as a type/interface and the documented factory is `resourceFromAttributes(...)`. Updated the import and `NodeSDK` resource configuration.
- The failure description said importing Express first results in no HTTP or Express spans. The more precise failure is loss of Express middleware and route-handler spans; top-level HTTP spans depend on HTTP instrumentation and module load order. Updated the wording and broken-example comment to avoid overstating the behavior.

## Review Notes
- The `ignoreLayers` and `ignoreLayersType` options match the current Express instrumentation configuration.
- The post correctly recommends preloading CommonJS tracing setup with `node --require ./tracing.js server.js`. For ESM applications, Node.js and OpenTelemetry examples commonly use `--import` with an ESM instrumentation file.

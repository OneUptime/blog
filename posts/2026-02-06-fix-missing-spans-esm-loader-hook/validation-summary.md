# Validation Summary: How to Fix Missing Spans When Using Node.js ES Modules Without the

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry JavaScript
- Node.js
- ECMAScript Modules
- CommonJS
- Node.js loader hooks
- Docker
- npm package configuration

## Sources Consulted
- OpenTelemetry JavaScript ESM support documentation: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/esm-support.md
- OpenTelemetry JavaScript Node.js getting started documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry instrumentation API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation.html
- Node.js `node:module` API documentation: https://nodejs.org/api/module.html
- Node.js CLI documentation for `--import` and `--experimental-loader`: https://nodejs.org/api/cli.html
- npm package metadata for `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/instrumentation`, and `@opentelemetry/exporter-trace-otlp-http`

## Issues Found
- The post said the modern `--import` setup applied to "Node.js 18.19+ and 20+". Current OpenTelemetry packages require `^18.19.0 || >=20.6.0`, and Node's `module.register()` was added in Node.js 20.6.0 and 18.19.0, so the wording was corrected to "Node.js 18.19+ and 20.6+".
- The post presented Node.js 16 as a general current option. Current OpenTelemetry packages no longer support Node.js 16, so the older `--experimental-loader` section was narrowed to users pinned to older OpenTelemetry package versions.
- The dependency versions were stale. The `package.json` example was updated to current compatible package versions checked from npm metadata.
- The post implied that all spans disappear without the ESM loader hook. Manual spans can still work, while the issue primarily affects auto-instrumented spans for ESM-loaded modules, so the wording was narrowed to auto-instrumented spans.
- The post referred to the loader hook as experimental throughout. Node now discourages direct `--experimental-loader` where `--import` plus `module.register()` is available, so the general wording was changed to "loader hook" while retaining the older-version `--experimental-loader` command.

## Review Notes
Node.js currently documents `module.register()` as deprecated in favor of `module.registerHooks()` in the latest documentation, but OpenTelemetry's published ESM hook guidance still centers on `@opentelemetry/instrumentation/hook.mjs`. The post now avoids overclaiming support for unsupported Node/OpenTelemetry combinations.

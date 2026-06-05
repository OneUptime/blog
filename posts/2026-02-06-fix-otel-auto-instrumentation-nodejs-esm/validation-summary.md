# Validation Summary: Fix OpenTelemetry Auto-Instrumentation Not Working in Node.js ESM Applications

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Node.js auto-instrumentation
- Node.js ECMAScript modules
- Node.js CommonJS preload and ESM preload flags
- Node.js module customization hooks
- Docker / NODE_OPTIONS startup configuration

## Sources Consulted
- OpenTelemetry JavaScript ESM support documentation: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/esm-support.md
- OpenTelemetry `@opentelemetry/instrumentation` package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation.html
- OpenTelemetry `@opentelemetry/resources` package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry `resourceFromAttributes` API reference: https://open-telemetry.github.io/opentelemetry-js/functions/_opentelemetry_resources.resourceFromAttributes.html
- OpenTelemetry Node.js getting started documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- Node.js `node:module` API documentation: https://nodejs.org/api/module.html
- Node.js CLI documentation for `--import`, `--experimental-loader`, and `--require`: https://nodejs.org/api/cli.html

## Issues Found
- The tracing setup used `new Resource(...)` from `@opentelemetry/resources`, but the current OpenTelemetry JS resources package documents `resourceFromAttributes(...)` as the supported way to create a resource from attributes. Updated the import and SDK configuration accordingly.
- The post said Node.js 18.19+ and Node.js 20+ should use only `--import ./tracing.mjs`. Official OpenTelemetry ESM support documentation says ESM auto-instrumentation still needs the OpenTelemetry loader hook as well. Updated the Node command and `package.json` script to include `--experimental-loader=@opentelemetry/instrumentation/hook.mjs`.
- The Docker `NODE_OPTIONS` example used only `--import ./tracing.mjs`, which would preload tracing but would not install the OpenTelemetry ESM loader hook. Updated it to include the loader hook.
- The `module.register()` example used `pathToFileURL('./')`. Replaced it with `import.meta.url`, matching Node's documented parent URL pattern and avoiding an unnecessary import.
- The post stated that `--require` only works with CommonJS files. Current Node.js versions can preload ES modules with `--require`, but older versions cannot. Updated the pitfall to make the claim version-specific.
- Added a caveat that `module.register()` is deprecated in Node.js 25.9+ in favor of newer customization hook APIs, while keeping the explicit OpenTelemetry loader hook as the safest current documented option.

## Review Notes
- Verified updated `resourceFromAttributes` imports and the loader-hook startup command against the latest OpenTelemetry packages available during review.
- Verified that `register('@opentelemetry/instrumentation/hook.mjs', import.meta.url)` starts successfully with the current `@opentelemetry/instrumentation` package.
- The OpenTelemetry ESM support guidance is still evolving, so the post's closing recommendation to check the `@opentelemetry/instrumentation` changelog remains appropriate.

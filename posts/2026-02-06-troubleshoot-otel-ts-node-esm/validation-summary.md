# Validation Summary: How to Troubleshoot OpenTelemetry Not Producing Traces in TypeScript Projects

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry JavaScript SDK and instrumentation
- TypeScript
- Node.js ECMAScript modules
- ts-node
- tsx
- CommonJS

## Sources Consulted
- OpenTelemetry JavaScript instrumentation docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation.html
- OpenTelemetry Node.js getting started docs: https://opentelemetry.io/uk/docs/languages/js/getting-started/nodejs/
- Node.js module customization hooks docs: https://nodejs.org/download/release/v22.12.0/docs/api/module.html
- Node.js packages and module type docs: https://nodejs.org/api/packages.html
- tsx documentation: https://tsx.is/ and https://tsx.is/dev-api/
- ts-node options documentation: https://typestrong.org/ts-node/docs/options
- TypeScript TSConfig and modules reference: https://www.typescriptlang.org/tsconfig/ and https://www.typescriptlang.org/docs/handbook/modules/reference

## Issues Found
- The post implied that preloading the tracing setup with `--import` was enough for ESM instrumentation. Updated the Node commands to include `--experimental-loader=@opentelemetry/instrumentation/hook.mjs`, which OpenTelemetry documents as required for ESM patching.
- The TypeScript ESM config used `module: "ESNext"` with legacy `moduleResolution: "node"`. Updated the Node ESM examples to `NodeNext`/`NodeNext`, matching TypeScript's documented Node ESM mode.
- The ESM source example used an extensionless relative import. Updated it to `import './tracing.js';`, which is the emitted extension expected by Node ESM and TypeScript's NodeNext mode.
- The tsx example used `node --loader tsx`, which is outdated for current tsx usage. Updated the command to use tsx with `--import`, and kept the OpenTelemetry hook registration example.
- The CommonJS tracing setup for an ESM app omitted the OpenTelemetry ESM loader hook. Updated the command to preload the CJS setup and register the OpenTelemetry ESM hook.
- Several fenced examples contained comments while using `json` fences. Updated those to `jsonc` where comments are present.
- The post described CommonJS mode as working "perfectly" with require hooks. Softened this to the accurate condition that the tracing setup must be required before instrumented modules are loaded.

## Review Notes
OpenTelemetry's ESM instrumentation hook is documented as experimental, and Node's loader APIs continue to evolve. The precompiled production recommendation is technically sound, but future updates should re-check the exact preferred loader registration form in OpenTelemetry's JavaScript docs.

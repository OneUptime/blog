# Validation Summary: How to Monitor MongoDB with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (driver and server)
- OpenTelemetry JS SDK (`@opentelemetry/sdk-node`, `@opentelemetry/api`)
- OpenTelemetry Auto-Instrumentation for Node.js
- OpenTelemetry Collector (MongoDB receiver)
- OTLP exporters (HTTP)
- Jaeger (trace backend)
- Prometheus (metrics backend)

## Sources Consulted
- OpenTelemetry JS SDK documentation: https://opentelemetry.io/docs/languages/js/
- `@opentelemetry/semantic-conventions` npm package changelog and exports (v1.25+)
- `@opentelemetry/instrumentation-mongodb` source and type definitions for `DbStatementSerializer`
- OpenTelemetry Collector `mongodbreceiver` documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/mongodbreceiver
- `@opentelemetry/sdk-node` NodeSDK configuration interface

## Issues Found

1. **Deprecated `SemanticResourceAttributes` import (line 51)**
   - **What was wrong:** The code used `SemanticResourceAttributes` from `@opentelemetry/semantic-conventions`, which has been deprecated since v1.0.0 of that package.
   - **What was changed:** Replaced with `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`, the current stable exports from `@opentelemetry/semantic-conventions`.
   - **Why:** Using deprecated APIs in a new tutorial leads to deprecation warnings and will break when the old exports are removed.

2. **Incorrect `dbStatementSerializer` callback signature (line 71)**
   - **What was wrong:** The code used `(commandName, commandObj) => { ... }` — a two-argument signature. The actual `DbStatementSerializer` type takes a single argument: `(commandObj: Record<string, unknown>) => string`.
   - **What was changed:** Updated to single-argument `(commandObj) => { return JSON.stringify(commandObj) }`.
   - **Why:** The two-argument form would receive the command object as the first argument and `undefined` as the second, producing incorrect serialized output.

3. **Unused `context` import (line 187)**
   - **What was wrong:** `context` was imported from `@opentelemetry/api` but never used in the custom spans example.
   - **What was changed:** Removed `context` from the import destructuring.
   - **Why:** Unused imports are misleading in tutorial code and suggest the reader needs something they don't.

4. **Missing direct dependencies in install command (line 33)**
   - **What was wrong:** The code imports from `@opentelemetry/sdk-metrics`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, and `@opentelemetry/api`, but these were not listed in the `npm install` command. While available as transitive dependencies, directly importing from uninstalled packages is fragile.
   - **What was changed:** Added `@opentelemetry/api`, `@opentelemetry/sdk-metrics`, `@opentelemetry/resources`, and `@opentelemetry/semantic-conventions` to the install command.
   - **Why:** Tutorials should explicitly install all directly-imported packages to avoid breakage if the dependency tree changes.

## Review Notes
- The MongoDB user creation snippet (Part 2) uses `use admin` which is a mongosh shell command, not JavaScript. The code block is labeled as `javascript` which is a common convention for mongosh examples but could be confusing. Not changed since this is standard practice in MongoDB documentation.
- The `span.setStatus({ code: 2, message: err.message })` in the custom spans example uses the numeric value `2` for `SpanStatusCode.ERROR`. Using `SpanStatusCode.ERROR` from `@opentelemetry/api` would be more readable, but the numeric literal is correct per the OpenTelemetry specification.
- The OTel Collector `memory_limiter` processor omits `check_interval`, which has a default value in recent collector versions. This is acceptable but could be made explicit for clarity.

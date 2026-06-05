# Validation Summary: How to Set Up OpenTelemetry in Next.js with the Instrumentation Hook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js instrumentation hook
- OpenTelemetry JavaScript SDK
- OpenTelemetry NodeSDK
- OTLP HTTP trace exporter
- TypeScript
- React Server Components
- Next.js App Router route handlers

## Sources Consulted
- Next.js instrumentation file convention: https://nextjs.org/docs/pages/api-reference/file-conventions/instrumentation
- Next.js 13 instrumentation documentation: https://nextjs.org/docs/13/pages/building-your-application/optimizing/instrumentation
- Next.js 14 instrumentation hook config documentation: https://nextjs.org/docs/14/pages/api-reference/next-config-js/instrumentationHook
- Next.js 15 release notes for stable instrumentation: https://nextjs.org/blog/next-15
- OpenTelemetry JS NodeSDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JS resources documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JS OTLP HTTP trace exporter documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-http.html
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- The post said Next.js 13.4 introduced the instrumentation hook. Changed this to Next.js 13.2, matching the official Next.js version history.
- The post said the instrumentation hook was stable since Next.js 14 while still requiring the experimental flag. Updated the guidance: Next.js 13.2 through 14 require `experimental.instrumentationHook`, while Next.js 15 and later make the instrumentation file stable and allow removing that config option.
- The instrumentation file location was described only as the project root. Updated it to include the documented `src` directory placement option.
- The OpenTelemetry resource examples used `new Resource(...)` and `SEMRESATTRS_*` constants. Updated them to the current documented `resourceFromAttributes(...)` helper and `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` constants.
- The dependency installation command omitted `@opentelemetry/api`, even though the verification route imports it directly. Added it to the install command.
- The OTLP trace exporter examples used `OTEL_EXPORTER_OTLP_ENDPOINT` with a full `/v1/traces` URL. Updated the code and environment examples to use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, which is the signal-specific variable documented for trace URLs.
- The manual span example used the numeric status code `1`. Updated it to import and use `SpanStatusCode.OK` from `@opentelemetry/api`.
- The production shutdown example did not exit after handling `SIGTERM`. Added `process.exit(0)` in a `finally` block, matching the OpenTelemetry NodeSDK shutdown pattern.
- The TypeScript section described adding type definitions and used a config that omitted DOM libraries. Updated the wording and snippet to include the instrumentation file while preserving standard Next.js DOM libraries and current `moduleResolution` behavior.
- The Server Components section implied all async operations are automatically traced. Updated it to clarify that tracing applies to supported and enabled instrumented libraries, such as compatible database clients.
- The conclusion claimed automatic tracing of the entire application and complete server-side coverage. Softened this to supported server-side libraries and improved coverage.

## Review Notes
The examples intentionally guard on `process.env.NEXT_RUNTIME === 'nodejs'` because they initialize `@opentelemetry/sdk-node`, which is not suitable for the Edge runtime. A future version of the post could add a separate Edge-runtime observability example, but the Node.js-focused setup is now technically consistent.

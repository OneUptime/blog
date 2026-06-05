# Validation Summary: How to Set Up OpenTelemetry Browser Instrumentation for Real User Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry browser tracing
- OTLP/HTTP exporters
- JavaScript Fetch and XMLHttpRequest instrumentation
- Document load and user interaction instrumentation
- W3C Trace Context propagation
- Browser CORS configuration

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry browser getting started guide: https://opentelemetry.io/docs/languages/js/getting-started/browser/
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters guide: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry context propagation concepts: https://opentelemetry.io/docs/concepts/context-propagation/
- OpenTelemetry JS API reference for resources: https://open-telemetry.github.io/opentelemetry-js/functions/_opentelemetry_resources.resourceFromAttributes.html
- Current npm package metadata and runtime exports for `@opentelemetry/*` packages, checked on 2026-06-05.

## Issues Found
- The install command imported `registerInstrumentations` but did not install `@opentelemetry/instrumentation`. Added it to the package list.
- The tracer setup used `new Resource(...)`, but current `@opentelemetry/resources` exposes `resourceFromAttributes` and `defaultResource()` instead. Updated the resource creation to match current OpenTelemetry JS docs.
- The tracer setup used `provider.addSpanProcessor(...)`, but current `WebTracerProvider` expects `spanProcessors` in the constructor and no longer exposes `addSpanProcessor`. Updated the code accordingly.
- The CORS explanation said browsers strip trace headers from preflight requests. Reworded it to explain that missing allowed headers can cause the browser to fail the CORS preflight and block the request.
- The custom span example referenced `fetchSearchResults(query)` without defining it and imported an unused `context` symbol. Added a small `fetchSearchResults` helper and removed the unused import.
- The export lifecycle section stated that `sendBeacon` ensures delivery during unload. Current OpenTelemetry HTTP exporters use `fetch` with `keepalive` where possible, so the wording was updated to describe that behavior and keep the flush as best-effort.
- The verification section said the request body could be Protocol Buffers or JSON depending on exporter configuration, but the selected `@opentelemetry/exporter-trace-otlp-http` package sends OTLP/HTTP JSON. Updated the text to distinguish it from `@opentelemetry/exporter-trace-otlp-proto`.

## Review Notes
OpenTelemetry browser instrumentation is still described by the official docs as experimental and mostly unspecified. The corrected examples match the current OpenTelemetry JavaScript package APIs checked during review, but future minor releases may still require updates.

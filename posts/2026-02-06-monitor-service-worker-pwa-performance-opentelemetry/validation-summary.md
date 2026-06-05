# Validation Summary: How to Monitor Service Worker and PWA Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry browser tracing
- OTLP HTTP trace exporter
- Service Worker API
- Cache API
- Progressive Web Apps
- Background Synchronization API
- IndexedDB

## Sources Consulted
- OpenTelemetry JavaScript browser getting started: https://opentelemetry.io/docs/languages/js/getting-started/browser/
- OpenTelemetry JavaScript manual instrumentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters and browser OTLP notes: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- MDN Service Worker API: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- MDN Using Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- MDN ServiceWorkerContainer.register(): https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register
- MDN WorkerGlobalScope.importScripts(): https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts
- MDN Background Synchronization API: https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API
- MDN SyncEvent.lastChance: https://developer.mozilla.org/en-US/docs/Web/API/SyncEvent/lastChance
- npm package contents for @opentelemetry/api@1.7.0, @opentelemetry/sdk-trace-web@1.22.0, and @opentelemetry/exporter-trace-otlp-http@0.48.0

## Issues Found
- The setup snippet used jsDelivr `build/bundles/*.min.js` URLs that are not present in the referenced OpenTelemetry npm packages. Replaced the snippet with module imports intended to be bundled with the service worker.
- The snippet used `provider.addSpanProcessor(...)`, while current OpenTelemetry JavaScript browser docs configure span processors through the `WebTracerProvider` constructor. Updated the setup code accordingly and imported `BatchSpanProcessor` from `@opentelemetry/sdk-trace-base`.
- The post described `importScripts` as the standard approach because module imports have limited support. Updated this to explain bundling and module service worker registration, and added `{ type: 'module' }` in the registration example.
- The OTLP browser export example omitted the browser CORS requirement. Added a short note that the collector endpoint must allow browser exports with CORS headers.
- The activate handler ended the span before `clients.claim()` completed, so claim failures would not be represented accurately. Moved success status and `span.end()` after `clients.claim()`, and rethrow errors so activation failures remain failures.
- The fetch handler started background revalidation without `event.waitUntil()`, so the browser could terminate the service worker before revalidation completed. Wrapped revalidation with `event.waitUntil(...)`.
- The network cache write used `cache.put(...)` without awaiting it while immediately marking the response as cached. Updated the code to await `cache.put(...)`.
- The HTTP span attributes used older semantic convention names (`http.url`, `http.method`, `http.status_code`). Updated them to `url.full`, `http.request.method`, and `http.response.status_code`.
- Background Sync was described as generally available. Added "Where supported" because MDN marks the API as limited availability.

## Review Notes
OpenTelemetry browser instrumentation is still documented as experimental and mostly unspecified. The tutorial is valid as a manual instrumentation pattern, but production implementations should verify browser support, collector CORS/CSP behavior, and whether batching or explicit flushing is appropriate for short-lived service worker events.

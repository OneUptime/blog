# Validation Summary: How to Monitor React Native App Performance with OneUptime

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- React Native
- TypeScript
- OpenTelemetry JavaScript SDK
- OTLP over HTTP
- OneUptime telemetry ingestion
- React error boundaries
- React Native device information and network state libraries
- GitHub Actions

## Sources Consulted
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/en/telemetry/open-telemetry
- OneUptime dashboard widget docs: https://oneuptime.com/docs/en/dashboards/widgets
- OneUptime token validation endpoint docs: https://oneuptime.com/docs/en/telemetry/profiles
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry OTLP exporter configuration docs: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry JavaScript package metadata for `@opentelemetry/sdk-trace-web`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/resources`, and `@opentelemetry/semantic-conventions`
- React Native InteractionManager docs: https://reactnative.dev/docs/interactionmanager
- React error boundary docs: https://react.dev/reference/react/Component
- react-native-device-info docs: https://github.com/react-native-device-info/react-native-device-info

## Issues Found
- The post used `https://otlp.oneuptime.com/v1/traces` and referred to a project API key. OneUptime documents `https://oneuptime.com/otlp` with `x-oneuptime-token`, so the trace exporter now uses `https://oneuptime.com/otlp/v1/traces` and the text uses telemetry ingestion token terminology.
- The OpenTelemetry setup used older JavaScript SDK APIs: `new Resource(...)`, `SemanticResourceAttributes`, and `tracerProvider.addSpanProcessor(...)`. Updated examples to current `resourceFromAttributes`, stable semantic convention constants, and `spanProcessors` in the `WebTracerProvider` constructor.
- The custom sampler imported `Sampler`, `SamplingResult`, and `SamplingDecision` from `@opentelemetry/api`, but those are SDK trace-base exports. Updated the import.
- Several examples referenced packages that were not installed (`uuid`, `@react-native-community/netinfo`, and `@opentelemetry/core`). Added them to the install commands and removed unused fetch/XMLHttpRequest instrumentation packages.
- The screen telemetry HOC used `React.ComponentType` and `React.FC` without importing `React`. Added the import.
- The frame-rate snippet used deprecated `InteractionManager` and did not actually count animation frames reliably. Replaced it with `requestAnimationFrame` and proper cancellation.
- The global error handler referenced React Native globals in a way that would fail TypeScript without declarations. Updated it to access `ErrorUtils` and `HermesInternal` through `globalThis` shims and handle non-`Error` promise rejection values.
- The network tracing snippet imported `getSessionAttributes` from the wrong module. Updated it to import from `./session`.
- The post included undocumented OneUptime REST paths for alert creation and deployments. Replaced those examples with documented automation guidance, token validation through the documented validation endpoint, and a portable OpenTelemetry deployment span.
- The dashboard JSON schema and widget type names were not documented by OneUptime. Replaced it with dashboard editor guidance using documented widget categories.
- The monitor-health snippet treated the OTLP exporter as an event emitter with `exporter.on('error')`, which is not part of the exporter API. Replaced it with a wrapper `SpanExporter` that observes export results.
- The TL;DR claimed crash capture with full stack traces. The code only captures JavaScript errors, not native crashes, so the claim was narrowed.

## Review Notes
The post is now technically valid as a React Native/OpenTelemetry tracing guide. Native crash reporting, real mobile FPS telemetry, and production-grade offline span persistence require deeper platform-specific work than the lightweight examples here provide.

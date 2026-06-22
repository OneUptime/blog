# Validation Summary: How to Implement Real User Monitoring (RUM) in React Applications

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- React
- TypeScript
- Real User Monitoring (RUM)
- Core Web Vitals
- Performance Observer API
- web-vitals
- Browser error and promise rejection handling
- Fetch, XMLHttpRequest, and Beacon APIs
- OneUptime telemetry ingestion

## Sources Consulted
- Google web.dev Web Vitals documentation: https://web.dev/articles/vitals
- Google web.dev Cumulative Layout Shift documentation: https://web.dev/articles/cls
- Google web.dev Interaction to Next Paint documentation: https://web.dev/articles/inp
- Google web.dev First Input Delay documentation: https://web.dev/articles/fid
- Google web.dev Total Blocking Time documentation: https://web.dev/articles/tbt
- Chrome for Developers Time to Interactive documentation: https://developer.chrome.com/docs/lighthouse/performance/interactive
- GoogleChrome web-vitals README and package types: https://github.com/GoogleChrome/web-vitals
- MDN PerformanceObserver documentation: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver
- MDN PerformanceEventTiming documentation: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming
- MDN Navigator.sendBeacon documentation: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon
- MDN Request keepalive documentation: https://developer.mozilla.org/en-US/docs/Web/API/Request/keepalive
- React Component / Error Boundary documentation: https://react.dev/reference/react/Component
- React Profiler documentation: https://react.dev/reference/react/Profiler
- React lazy documentation: https://react.dev/reference/react/lazy
- OneUptime Real User Monitoring documentation: https://oneuptime.com/docs/en/telemetry/real-user-monitoring

## Issues Found
- The custom CLS implementation summed all layout shifts for the full page lifetime. Updated it to use CLS session windows: shifts less than 1 second apart, capped to a 5 second window, and report the largest session value.
- The long task observer labeled a field-measured full-page long-task sum as TBT. Updated the text and metric name to `LONG_TASK_BLOCKING_TIME`, because Lighthouse TBT is a lab metric measured over the FCP-to-TTI window.
- The additional metrics table described FID and TTI as current metrics worth tracking. Updated FID as a historical comparison metric and TTI as a legacy lab metric removed from Lighthouse 10.
- The `ErrorData` type omitted the `occurrences` field that the error tracker adds. Added `occurrences?: number`.
- The collector imported `generateId` but did not use it. Removed the unused import from the example.
- The `RUMProvider` required a full `RUMConfig`, but the later usage passed a partial config relying on client defaults. Changed the provider prop to `Partial<RUMConfig>` and updated it to expose the initialized client through state.
- The lazy loading example measured a timer after the wrapper mounted rather than the dynamic import duration. Reworked it so `lazyWithRUM` tracks the actual import promise and reports success or failure.
- The reporter used `sendBeacon` while relying on a custom `X-API-Key` header, which Beacon requests cannot set. Updated the beacon payload to include the API key in the JSON body.
- The dashboard distribution bars divided by zero when a metric bucket had no samples. Added a zero-safe percentage helper.
- The OneUptime integration used a non-documented default `/api/rum/ingest` URL on `oneuptime.com`. Changed it to a generic local collector endpoint and clarified that OneUptime ingestion should be done through OTLP/HTTP with a telemetry ingestion token.

## Review Notes
The examples are still tutorial scaffolding rather than a drop-in SDK. A production implementation should centralize privacy filtering before events are queued, remove event listeners on shutdown, and align its backend collector schema with OpenTelemetry if forwarding to OneUptime.

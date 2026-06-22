# Validation Summary: How to Track Web Vitals (LCP, FID, CLS) in React Applications

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- React
- Core Web Vitals
- web-vitals JavaScript library
- Browser Performance APIs
- Navigator.sendBeacon and fetch keepalive
- React Router
- Next.js Image
- OpenTelemetry trace payloads
- Lighthouse

## Sources Consulted
- GoogleChrome web-vitals README and API reference: https://github.com/GoogleChrome/web-vitals
- web.dev Web Vitals overview and Core Web Vitals thresholds: https://web.dev/articles/vitals
- Chrome for Developers Soft Navigations API documentation: https://developer.chrome.com/docs/web-platform/soft-navigations
- MDN Navigator.sendBeacon documentation: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon
- MDN fetchpriority HTML attribute documentation: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority
- React createRoot documentation: https://react.dev/reference/react-dom/client/createRoot
- React renderToPipeableStream documentation: https://react.dev/reference/react-dom/server/renderToPipeableStream
- React Profiler documentation: https://react.dev/reference/react/Profiler
- Next.js Image component documentation: https://nextjs.org/docs/app/api-reference/components/image

## Issues Found
- The soft-navigation `PerformanceObserver` example observed `soft-navigation` entries without checking browser support. Added `PerformanceObserver.supportedEntryTypes.includes('soft-navigation')` before observing, matching Chrome's experimental API guidance.
- The Next.js Image example used the `priority` prop. Current Next.js documentation marks `priority` as deprecated starting in Next.js 16 in favor of `preload`, so the example now uses `preload`.
- The LCP attribution debug example logged `metric.attribution.element` and `metric.attribution.resourceLoadTime`, but current `web-vitals/attribution` exposes `target` and `resourceLoadDuration`. Updated the field names and labels.
- The INP attribution debug example used `eventType`, `eventTarget`, and `eventTime`, which are not current attribution field names. Updated them to `interactionType`, `interactionTarget`, and `interactionTime`.

## Review Notes
The article correctly treats INP, not FID, as the current responsiveness Core Web Vital. The legacy FID references in the quick reference and optimization checklist are acceptable as historical/contextual material, but future revisions could label them more explicitly as legacy to avoid reader confusion.

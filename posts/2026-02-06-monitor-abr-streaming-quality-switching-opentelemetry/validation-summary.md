# Validation Summary: How to Monitor Adaptive Bitrate Streaming Quality Switching Events

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript metrics
- hls.js adaptive bitrate events
- Adaptive bitrate streaming quality monitoring
- JavaScript

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry metrics concepts documentation: https://opentelemetry.io/docs/concepts/signals/metrics/
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- hls.js API documentation for `Hls.Events.LEVEL_SWITCHED`: https://github.com/video-dev/hls.js/blob/master/docs/API.md
- dash.js player events documentation: https://dashif.org/dash.js/pages/usage/player-events.html
- Shaka Player API documentation: https://shaka-player-demo.appspot.com/docs/api/shaka.Player.html

## Issues Found
- The bitrate histogram was described and named as a current-value metric, but OpenTelemetry documentation describes histograms as distributions and observable gauges as current-value instruments. I renamed the metric to `abr.selected.bitrate` and updated the comments/description to clarify that it records the distribution of bitrates selected after quality switches.
- The hls.js switch direction logic classified equal-bitrate switches as downswitches. I changed it to report `same` for equal-bitrate switches so the downswitch counter only increments for true bitrate decreases, and updated oscillation detection to ignore `same` directions.
- The composite quality score could produce invalid values if the observable gauge callback ran before hls.js had loaded any levels, because `Math.max(...[])` returns `-Infinity`. I added guards for an empty level list and non-positive max bitrate.

## Review Notes
- The OpenTelemetry metric API usage (`createCounter`, `createHistogram`, `createObservableGauge`, `addCallback`, `add`, and `record`) matches the current JavaScript documentation.
- hls.js documents `Hls.Events.LEVEL_SWITCHED` as firing when a level switch is effective with `data.level` containing the new level id, matching the example.
- The browser-side OpenTelemetry setup is not shown in the post; OpenTelemetry's JavaScript documentation notes that a `MeterProvider` must be configured or metrics remain no-op, and browser instrumentation support is experimental/mostly unspecified. This is acceptable for a focused instrumentation snippet but worth adding in a future expanded setup guide.

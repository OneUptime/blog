# Validation Summary: How to Instrument Live Event Streaming Infrastructure with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python API
- OpenTelemetry JavaScript API
- WebRTC and RTCPeerConnection statistics
- HLS and Low-Latency HLS
- MPEG-DASH and CMAF low-latency delivery
- CDN/origin streaming infrastructure observability

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- MDN Web Docs, RTCInboundRtpStreamStats: https://developer.mozilla.org/en-US/docs/Web/API/RTCInboundRtpStreamStats
- MDN Web Docs, RTCInboundRtpStreamStats packetsReceived: https://developer.mozilla.org/en-US/docs/Web/API/RTCInboundRtpStreamStats/packetsReceived
- Apple HLS authoring specification for Apple devices: https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices/
- Apple Low-Latency HLS documentation: https://developer.apple.com/documentation/http-live-streaming/enabling-low-latency-http-live-streaming-hls
- DASH-IF IOP v5 guidelines: https://dashif.org/guidelines/iop-v5/

## Issues Found
- The Python `create_observable_gauge` examples used callbacks that accepted a `result` object and delegated to helper functions. Current OpenTelemetry Python callbacks accept `CallbackOptions` and return or yield `Observation` instances. Updated both observable gauge examples to define callbacks that yield `Observation` values.
- The Python examples used `time.time()` later in the post without importing `time`. Added the import in the initial Python snippet.
- The WebRTC example referenced an undefined `stream_errors_counter`. Added a matching `streamErrors` counter and used it in the failure path.
- The WebRTC NACK and PLI examples added cumulative `nackCount` and `pliCount` values on every polling interval, which would overcount. Updated the example to track previous report values and add only positive deltas.

## Review Notes
- The protocol descriptions are broadly accurate: WebRTC targets ultra-low latency, HLS and DASH are segment-based HTTP delivery protocols, LL-HLS is defined by HLS 2nd Edition low-latency extensions, and DASH-IF documents low-latency DASH services for CMAF-based workflows.
- The threshold examples for packet loss, origin latency, and segment publish latency are operational guidance rather than universal standards. They should be tuned to each production system's player behavior, CDN topology, encoder settings, and latency target.

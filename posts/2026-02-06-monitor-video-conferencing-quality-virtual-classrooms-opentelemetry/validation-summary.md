# Validation Summary: How to Monitor Video Conferencing Quality

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry JavaScript metrics and traces
- OpenTelemetry Python metrics and traces
- WebRTC `RTCPeerConnection.getStats()`
- WebRTC inbound RTP statistics
- WebRTC ICE candidate pair statistics
- SFU media-quality monitoring

## Sources Consulted
- MDN Web Docs: `RTCPeerConnection.getStats()` - https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getStats
- MDN Web Docs: `RTCIceCandidatePairStats` - https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidatePairStats
- W3C: Identifiers for WebRTC's Statistics API - https://www.w3.org/TR/webrtc-stats/
- OpenTelemetry JavaScript instrumentation docs - https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript API reference for `Meter` and `Gauge` - https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Meter.html
- OpenTelemetry Python instrumentation docs - https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API docs - https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html

## Issues Found
- The post said 2-3% packet loss makes video unwatchable, while its own threshold table classified 1-3% as acceptable. Changed the statement to say that 2-3% loss can noticeably degrade video quality.
- The JavaScript example created a bitrate observable gauge but never registered a callback or recorded a value. Changed it to a synchronous OpenTelemetry JavaScript gauge and recorded bitrate from `bytesReceived` deltas between `getStats()` samples.
- The JavaScript example listed frame rate as a key metric but did not collect it. Added a frame-rate gauge using the WebRTC `framesPerSecond` stat when present.
- The packet-loss calculation used `packetsLost` directly, but the WebRTC stats specification notes that `packetsLost` can be negative because it is estimated. Clamped lost packets to zero before calculating the displayed loss percentage.
- The RTT code recorded any `candidate-pair` report with state `succeeded`, which can include non-selected pairs. Updated the example to use `transport.selectedCandidatePairId` and record RTT only for the selected ICE candidate pair.

## Review Notes
The code examples are syntactically valid after the fixes. In a production implementation, packet-loss and bitrate alerting should usually be based on interval deltas rather than only cumulative session values, and the OpenTelemetry SDK/exporter setup must be initialized elsewhere for the API calls to emit telemetry.

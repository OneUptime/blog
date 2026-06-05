# Validation Summary: How to Monitor Unified Communications Platform Call Quality Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry JavaScript metrics API
- OpenTelemetry Python metrics API
- WebRTC `RTCPeerConnection.getStats()`
- RTP/RTCP and RTCP XR
- MOS and ITU-T G.107 E-model concepts
- Session Border Controller metrics

## Sources Consulted
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry JavaScript API documentation for `Meter`: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Meter.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- W3C WebRTC Statistics specification: https://www.w3.org/TR/webrtc-stats/
- W3C WebRTC specification, mandatory stats table: https://w3c.github.io/webrtc-pc/
- RFC 3611, RTP Control Protocol Extended Reports (RTCP XR): https://www.rfc-editor.org/rfc/rfc3611
- ITU-T G.107 E-model recommendation overview: https://www.itu.int/rec/T-REC-G.107

## Issues Found
- The JavaScript example called `detectPlatform()` but did not define it, so `collectStats()` would throw at runtime. Added a small helper that returns browser platform information when available and `unknown` otherwise.
- The JavaScript MOS calculation could receive an undefined RTT before a `remote-inbound-rtp` report was available, producing `NaN`. Initialized `currentRTT` and defaulted missing RTT values to zero in `calculateMOS()`.
- The codec change detector iterated over every `codec` stats object, which can report changes between unrelated codec stats instead of the codec used by the active RTP stream. Updated it to resolve the inbound RTP stream's `codecId` and compare that codec's `mimeType`.
- The server-side snippet labeled `active_calls` as an active-call gauge while using an OpenTelemetry UpDownCounter. Updated the comment to match the instrument.

## Review Notes
- The code examples are syntactically valid after the fixes.
- The post uses `ucaas.call_id` and `ucaas.user_id` as metric attributes. This can create high-cardinality metric streams in production backends; traces, logs, exemplars, or sampled/debug metrics are usually safer for per-call or per-user correlation.
- The MOS function is explicitly described as a simplified estimate, which is appropriate. Production MOS/R-factor calculations should use the exact impairment factors and codec assumptions required by the deployment.

# Validation Summary: How to Instrument Telehealth Video Consultation Platforms with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript metrics SDK
- OpenTelemetry OTLP HTTP metric exporter
- OpenTelemetry Python tracing SDK
- OpenTelemetry OTLP gRPC span exporter
- WebRTC `RTCPeerConnection.getStats()`
- WebRTC inbound RTP and ICE candidate-pair statistics
- Alerting rule configuration concepts

## Sources Consulted
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry JavaScript `@opentelemetry/sdk-metrics` package metadata and type declarations, version 2.7.1: https://www.npmjs.com/package/@opentelemetry/sdk-metrics
- MDN `RTCInboundRtpStreamStats` documentation: https://developer.mozilla.org/en-US/docs/Web/API/RTCInboundRtpStreamStats
- MDN `RTCIceCandidatePairStats` documentation: https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidatePairStats
- MDN `RTCInboundRtpStreamStats.packetsLost` documentation: https://developer.mozilla.org/en-US/docs/Web/API/RTCInboundRtpStreamStats/packetsLost

## Issues Found
- The original packet-loss counter added `report.packetsLost` on every polling interval. WebRTC `packetsLost` is a cumulative RTP statistic, so adding the cumulative value repeatedly would overcount losses. Changed the code to keep previous inbound RTP stats per report ID and add only positive interval deltas to `telehealth.packets_lost_total`.
- The original packet-loss alert used `rate(telehealth.packets_lost_total[1m]) > 0.05` while describing a 5% packet-loss threshold. A packet counter rate is packets per second, not a percentage. Added `telehealth.packet_loss_ratio` and changed the alert condition to compare that ratio with `0.05`.
- The original RTT code recorded every `candidate-pair` report in the `succeeded` state. Multiple candidate pairs can exist, and MDN documents `RTCTransportStats.selectedCandidatePairId` as the spec-compliant way to identify the selected pair. Updated the code to collect selected candidate-pair IDs from `transport` stats and record RTT only for the selected pair.
- Added guards before recording optional WebRTC numeric fields such as `jitter` and `currentRoundTripTime`, because these stats properties are documented as optional or browser-dependent in parts of the WebRTC stats surface.

## Review Notes
The OpenTelemetry JavaScript `MeterProvider({ readers: [...] })`, `PeriodicExportingMetricReader`, and OTLP metric exporter usage matches the current package shape. The Python tracing example uses current OpenTelemetry SDK and OTLP gRPC exporter APIs; a production service would normally set a `service.name` resource, but the existing snippet is still technically valid.

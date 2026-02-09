# How to Instrument Telehealth Video Consultation Platforms with OpenTelemetry for Quality-of-Experience Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Telehealth, Video Quality, WebRTC

Description: Instrument telehealth video platforms with OpenTelemetry to capture quality-of-experience metrics like jitter, latency, and frame rates.

Telehealth video consultations have become a critical part of healthcare delivery. When a physician is examining a patient remotely, video quality is not just a convenience issue, it is a clinical quality issue. A frozen frame during a dermatology consult or choppy audio during a psychiatric session can directly impact patient care. You need to measure the actual quality of experience, not just whether the server is up.

This post walks through instrumenting a WebRTC-based telehealth platform with OpenTelemetry to capture the metrics that actually matter for clinical video quality.

## Capturing WebRTC Stats with OpenTelemetry

WebRTC provides a `getStats()` API that returns detailed media statistics. We will pull these stats and ship them as OpenTelemetry metrics from the browser client.

```javascript
// telehealth-otel-client.js
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

// Set up the meter provider to export metrics via OTLP
const exporter = new OTLPMetricExporter({
  url: 'https://telemetry.yourhospital.org/v1/metrics',
});

const meterProvider = new MeterProvider({
  readers: [
    new PeriodicExportingMetricReader({
      exporter: exporter,
      exportIntervalMillis: 10000, // Export every 10 seconds
    }),
  ],
});

const meter = meterProvider.getMeter('telehealth-video', '1.0.0');

// Define instruments for video quality metrics
const videoJitter = meter.createHistogram('telehealth.video.jitter_ms', {
  description: 'Video stream jitter in milliseconds',
  unit: 'ms',
});

const audioJitter = meter.createHistogram('telehealth.audio.jitter_ms', {
  description: 'Audio stream jitter in milliseconds',
  unit: 'ms',
});

const roundTripTime = meter.createHistogram('telehealth.rtt_ms', {
  description: 'ICE candidate pair round trip time',
  unit: 'ms',
});

const framesPerSecond = meter.createHistogram('telehealth.video.fps', {
  description: 'Video frames decoded per second',
  unit: 'fps',
});

const packetsLost = meter.createCounter('telehealth.packets_lost_total', {
  description: 'Total RTP packets lost during the session',
  unit: 'packets',
});
```

## Polling WebRTC Stats and Recording Metrics

Now we connect to the RTCPeerConnection and periodically extract statistics:

```javascript
// Collect stats from the active WebRTC peer connection
async function collectWebRTCMetrics(peerConnection, sessionAttributes) {
  const stats = await peerConnection.getStats();

  stats.forEach((report) => {
    // Capture inbound video stream quality
    if (report.type === 'inbound-rtp' && report.kind === 'video') {
      videoJitter.record(report.jitter * 1000, sessionAttributes);
      framesPerSecond.record(report.framesPerSecond || 0, sessionAttributes);

      if (report.packetsLost > 0) {
        packetsLost.add(report.packetsLost, {
          ...sessionAttributes,
          'media.kind': 'video',
        });
      }
    }

    // Capture inbound audio stream quality
    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
      audioJitter.record(report.jitter * 1000, sessionAttributes);

      if (report.packetsLost > 0) {
        packetsLost.add(report.packetsLost, {
          ...sessionAttributes,
          'media.kind': 'audio',
        });
      }
    }

    // Capture connection-level metrics from ICE candidate pairs
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      roundTripTime.record(
        report.currentRoundTripTime * 1000,
        sessionAttributes
      );
    }
  });
}

// Start periodic collection when a consultation begins
function startMetricsCollection(peerConnection, consultationId) {
  // Attributes that identify this session (no PHI)
  const sessionAttrs = {
    'telehealth.session.id': consultationId,
    'telehealth.platform': 'web',
    'telehealth.role': 'patient', // or 'provider'
  };

  // Poll every 5 seconds during the consultation
  const intervalId = setInterval(() => {
    collectWebRTCMetrics(peerConnection, sessionAttrs);
  }, 5000);

  // Stop collection when the peer connection closes
  peerConnection.addEventListener('connectionstatechange', () => {
    if (peerConnection.connectionState === 'closed' ||
        peerConnection.connectionState === 'disconnected') {
      clearInterval(intervalId);
    }
  });

  return intervalId;
}
```

## Server-Side Tracing for Signaling and Session Management

The client-side metrics tell you about media quality, but you also need to trace the signaling flow (session creation, ICE negotiation, TURN relay setup) on the server:

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("telehealth-signaling", "1.0.0")

def handle_session_create(consultation_id, provider_id, patient_id):
    """Handle the creation of a new telehealth video session."""
    with tracer.start_as_current_span("telehealth.session.create") as span:
        span.set_attribute("telehealth.consultation_id", consultation_id)
        span.set_attribute("telehealth.session_type", "video")

        # Allocate TURN server resources
        with tracer.start_as_current_span("telehealth.turn.allocate") as turn_span:
            turn_credentials = allocate_turn_server(consultation_id)
            turn_span.set_attribute("turn.server.region", turn_credentials["region"])
            turn_span.set_attribute("turn.protocol", "udp")

        # Create the signaling room
        with tracer.start_as_current_span("telehealth.signaling.room_create") as room_span:
            room = create_signaling_room(consultation_id)
            room_span.set_attribute("signaling.room_id", room["id"])
            room_span.set_attribute("signaling.max_participants", 2)

        return {
            "room": room,
            "turn": turn_credentials,
        }

def handle_ice_candidate(session_id, candidate_data):
    """Trace ICE candidate exchange during WebRTC negotiation."""
    with tracer.start_as_current_span("telehealth.ice.candidate_exchange") as span:
        span.set_attribute("telehealth.session_id", session_id)
        span.set_attribute("ice.candidate_type", candidate_data.get("type", "unknown"))
        span.set_attribute("ice.protocol", candidate_data.get("protocol", "unknown"))

        forward_ice_candidate(session_id, candidate_data)
```

## Defining Quality Thresholds

Not all degradation is equal. Here are the thresholds that matter for clinical video:

```yaml
# alerting-rules.yaml for your monitoring backend
rules:
  # Audio jitter above 30ms makes conversation difficult
  - alert: TelehealthAudioJitterHigh
    condition: telehealth.audio.jitter_ms > 30
    for: 60s
    severity: warning

  # Video FPS below 15 means the provider might miss visual cues
  - alert: TelehealthVideoFPSLow
    condition: telehealth.video.fps < 15
    for: 30s
    severity: critical

  # Round trip time above 300ms makes real-time conversation painful
  - alert: TelehealthRTTHigh
    condition: telehealth.rtt_ms > 300
    for: 60s
    severity: warning

  # Packet loss above 5% severely degrades quality
  - alert: TelehealthPacketLossHigh
    condition: rate(telehealth.packets_lost_total[1m]) > 0.05
    for: 30s
    severity: critical
```

## Wrapping Up

Instrumenting telehealth platforms with OpenTelemetry gives you the data to answer the question that matters most: "Can the doctor and patient actually see and hear each other clearly?" By combining client-side WebRTC metrics with server-side signaling traces, you get a complete picture of the consultation experience. The key metrics to focus on are jitter, round-trip time, frames per second, and packet loss. Set your alert thresholds based on clinical needs, not just engineering comfort levels, because in healthcare, video quality directly impacts patient outcomes.

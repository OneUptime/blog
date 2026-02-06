# How to Monitor Video Conferencing Quality (Jitter, Packet Loss, Latency) for Virtual Classrooms with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Video Conferencing, WebRTC, Virtual Classrooms

Description: Monitor jitter, packet loss, and latency in virtual classroom video conferencing using OpenTelemetry metrics and traces.

Virtual classrooms depend on stable video and audio quality. When a teacher's video freezes mid-lecture or audio cuts out during a Q&A session, the learning experience breaks down. Monitoring video conferencing quality metrics like jitter, packet loss, and latency with OpenTelemetry lets you detect degradation before it becomes disruptive and helps you understand patterns across different networks, regions, and time periods.

## Key Quality Metrics for Video Conferencing

Before writing any code, you need to understand the metrics that matter for video quality:

- **Jitter**: Variation in packet arrival times. High jitter causes choppy audio and video.
- **Packet loss**: Percentage of packets that never arrive. Even 2-3% loss makes video unwatchable.
- **Round-trip latency**: Time for a packet to travel to the recipient and back. Above 300ms, conversations become awkward.
- **Bitrate**: Current encoding rate. Drops indicate the system is compensating for poor conditions.
- **Frame rate**: Actual frames per second being delivered to the viewer.

## Collecting WebRTC Stats with OpenTelemetry

Most virtual classroom platforms use WebRTC under the hood. The WebRTC API exposes detailed statistics through `getStats()`. Here is how to capture those stats and feed them into OpenTelemetry:

```javascript
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('virtual-classroom');

// Define histograms for quality metrics
const jitterHistogram = meter.createHistogram('webrtc.jitter_ms', {
  description: 'Jitter in milliseconds for audio/video streams',
  unit: 'ms',
});

const packetLossHistogram = meter.createHistogram('webrtc.packet_loss_percent', {
  description: 'Packet loss percentage for media streams',
  unit: '%',
});

const rttHistogram = meter.createHistogram('webrtc.rtt_ms', {
  description: 'Round-trip time in milliseconds',
  unit: 'ms',
});

const bitrateGauge = meter.createObservableGauge('webrtc.bitrate_kbps', {
  description: 'Current bitrate in kilobits per second',
  unit: 'kbps',
});

// Collect stats from a WebRTC peer connection every 2 seconds
async function collectWebRTCMetrics(peerConnection, sessionInfo) {
  const stats = await peerConnection.getStats();
  const attributes = {
    'classroom.session_id': sessionInfo.sessionId,
    'classroom.role': sessionInfo.role, // 'teacher' or 'student'
    'classroom.region': sessionInfo.region,
  };

  stats.forEach((report) => {
    if (report.type === 'inbound-rtp' && report.kind === 'video') {
      // Calculate packet loss percentage
      const totalPackets = report.packetsReceived + report.packetsLost;
      const lossPercent = totalPackets > 0
        ? (report.packetsLost / totalPackets) * 100
        : 0;

      packetLossHistogram.record(lossPercent, {
        ...attributes,
        'webrtc.media_type': 'video',
      });

      // Jitter is reported in seconds by WebRTC, convert to ms
      if (report.jitter !== undefined) {
        jitterHistogram.record(report.jitter * 1000, {
          ...attributes,
          'webrtc.media_type': 'video',
        });
      }
    }

    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      // Round-trip time
      if (report.currentRoundTripTime !== undefined) {
        rttHistogram.record(report.currentRoundTripTime * 1000, attributes);
      }
    }
  });
}
```

## Server-Side Media Quality Monitoring

If your platform uses a Selective Forwarding Unit (SFU) to route video streams, you can also collect quality metrics on the server side. This gives you visibility into network issues between the SFU and each participant:

```python
from opentelemetry import metrics, trace

meter = metrics.get_meter("classroom-sfu")
tracer = trace.get_tracer("classroom-sfu")

# Track per-participant stream quality
stream_jitter = meter.create_histogram(
    "sfu.stream.jitter_ms",
    description="Jitter observed at the SFU for each participant stream",
    unit="ms",
)

stream_packet_loss = meter.create_histogram(
    "sfu.stream.packet_loss_percent",
    description="Packet loss percentage at the SFU",
    unit="%",
)

def on_rtp_stats_update(participant_id, session_id, stats):
    """Called periodically by the SFU with updated stream stats."""
    attrs = {
        "classroom.participant_id": participant_id,
        "classroom.session_id": session_id,
        "classroom.stream_type": stats.media_type,
    }

    stream_jitter.record(stats.jitter_ms, attrs)
    stream_packet_loss.record(stats.loss_percent, attrs)

    # If quality drops below threshold, create a trace span for investigation
    if stats.loss_percent > 5.0 or stats.jitter_ms > 50:
        with tracer.start_as_current_span(
            "sfu.quality_degradation",
            attributes={
                **attrs,
                "sfu.jitter_ms": stats.jitter_ms,
                "sfu.packet_loss_percent": stats.loss_percent,
                "sfu.action": "quality_alert",
            }
        ):
            # Log the degradation event for later analysis
            pass
```

## Correlating Quality with User Experience

Raw metrics are useful, but correlating them with user experience events makes them actionable. Track when students report issues or when the system automatically adjusts quality:

```javascript
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('classroom-experience');

// When the system automatically reduces video quality
function onQualityDowngrade(session, reason, fromResolution, toResolution) {
  const span = tracer.startSpan('classroom.quality_downgrade', {
    attributes: {
      'classroom.session_id': session.id,
      'classroom.downgrade_reason': reason, // 'high_packet_loss', 'bandwidth_limited'
      'classroom.resolution_from': fromResolution, // '720p'
      'classroom.resolution_to': toResolution, // '360p'
      'classroom.participant_count': session.participantCount,
    },
  });
  span.end();
}

// When a student clicks "I'm having audio/video issues"
function onUserReportedIssue(session, userId, issueType) {
  const span = tracer.startSpan('classroom.user_reported_issue', {
    attributes: {
      'classroom.session_id': session.id,
      'classroom.reporter_id': userId,
      'classroom.issue_type': issueType, // 'audio_choppy', 'video_frozen', 'echo'
    },
  });
  span.end();
}
```

## Setting Up Quality Thresholds and Alerts

Based on industry standards for acceptable video conferencing quality, configure alerts:

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| Jitter | < 30ms | 30-50ms | > 50ms |
| Packet Loss | < 1% | 1-3% | > 3% |
| RTT | < 150ms | 150-300ms | > 300ms |

Set up alerts when metrics cross into the "Poor" range, especially during scheduled class times.

## Conclusion

Monitoring video conferencing quality for virtual classrooms requires collecting WebRTC stats on both the client and server side and correlating them with user experience events. OpenTelemetry provides the framework to do this consistently across your platform, giving you the data you need to keep virtual classrooms running smoothly regardless of network conditions.

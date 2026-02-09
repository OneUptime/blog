# How to Monitor Unified Communications Platform (UCaaS) Call Quality Metrics with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, UCaaS, Call Quality, MOS, Telecommunications

Description: Monitor UCaaS platform call quality metrics including MOS scores, jitter, packet loss, and codec performance with OpenTelemetry.

Unified Communications as a Service (UCaaS) platforms handle voice calls, video conferences, and messaging for millions of users. Call quality is the metric that matters most to end users. A dropped frame in video or a crackle in audio can derail a business meeting. In this post, we will build a comprehensive call quality monitoring system using OpenTelemetry.

## Call Quality Metrics Primer

The key metrics that determine perceived call quality are:

- **MOS (Mean Opinion Score)**: 1.0 to 5.0 scale, where 4.0+ is considered good
- **Jitter**: Variation in packet arrival time, measured in milliseconds
- **Packet loss**: Percentage of RTP packets that never arrive
- **Round-trip time (RTT)**: Network latency between endpoints
- **R-Factor**: ITU-T G.107 E-model output, 0-100 scale

These metrics are typically available from the media engine (WebRTC stats, RTP/RTCP reports) and from the SBC (Session Border Controller).

## Collecting WebRTC Stats with OpenTelemetry

Most modern UCaaS clients use WebRTC. The `getStats()` API provides rich media quality data. Here is a JavaScript instrumentation for a UCaaS web client.

```javascript
// ucaas_client_telemetry.js
const { trace, metrics } = require('@opentelemetry/api');

const tracer = trace.getTracer('ucaas.client');
const meter = metrics.getMeter('ucaas.client');

// Define call quality metric instruments
const mosHistogram = meter.createHistogram('ucaas.call.mos', {
  description: 'Mean Opinion Score for active calls',
  unit: '{score}',
});

const jitterHistogram = meter.createHistogram('ucaas.call.jitter', {
  description: 'Audio jitter in milliseconds',
  unit: 'ms',
});

const packetLossHistogram = meter.createHistogram('ucaas.call.packet_loss', {
  description: 'Packet loss percentage',
  unit: '%',
});

const rttHistogram = meter.createHistogram('ucaas.call.rtt', {
  description: 'Round-trip time in milliseconds',
  unit: 'ms',
});

const codecCounter = meter.createCounter('ucaas.call.codec_changes', {
  description: 'Number of codec changes during a call',
  unit: '{change}',
});

class CallQualityMonitor {
  constructor(peerConnection, callId, userId) {
    this.pc = peerConnection;
    this.callId = callId;
    this.userId = userId;
    this.previousStats = null;
    this.previousCodec = null;
    this.interval = null;
  }

  start() {
    // Collect stats every 2 seconds during the call
    this.interval = setInterval(() => this.collectStats(), 2000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async collectStats() {
    const stats = await this.pc.getStats();
    const commonAttrs = {
      'ucaas.call_id': this.callId,
      'ucaas.user_id': this.userId,
      'ucaas.platform': detectPlatform(),
    };

    stats.forEach((report) => {
      // Process inbound RTP audio stats
      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        const jitter = report.jitter * 1000; // convert to ms
        jitterHistogram.record(jitter, {
          ...commonAttrs,
          'ucaas.media_type': 'audio',
          'ucaas.direction': 'inbound',
        });

        // Calculate packet loss percentage
        if (this.previousStats) {
          const prevReport = this.previousStats.get(report.id);
          if (prevReport) {
            const packetsReceived = report.packetsReceived - prevReport.packetsReceived;
            const packetsLost = report.packetsLost - prevReport.packetsLost;
            const totalPackets = packetsReceived + packetsLost;

            if (totalPackets > 0) {
              const lossRate = (packetsLost / totalPackets) * 100;
              packetLossHistogram.record(lossRate, {
                ...commonAttrs,
                'ucaas.media_type': 'audio',
              });

              // Estimate MOS using simplified E-model
              const mos = calculateMOS(jitter, lossRate, this.currentRTT);
              mosHistogram.record(mos, commonAttrs);
            }
          }
        }
      }

      // Process remote inbound RTP for RTT
      if (report.type === 'remote-inbound-rtp' && report.kind === 'audio') {
        if (report.roundTripTime !== undefined) {
          const rttMs = report.roundTripTime * 1000;
          this.currentRTT = rttMs;
          rttHistogram.record(rttMs, {
            ...commonAttrs,
            'ucaas.media_type': 'audio',
          });
        }
      }

      // Detect codec changes
      if (report.type === 'codec') {
        if (this.previousCodec && this.previousCodec !== report.mimeType) {
          codecCounter.add(1, {
            ...commonAttrs,
            'ucaas.codec.from': this.previousCodec,
            'ucaas.codec.to': report.mimeType,
          });
        }
        this.previousCodec = report.mimeType;
      }
    });

    this.previousStats = stats;
  }
}

// Simplified MOS estimation based on ITU-T G.107 E-model
function calculateMOS(jitterMs, packetLossPercent, rttMs) {
  // Effective latency
  const effectiveLatency = rttMs + (jitterMs * 2) + 10;

  // R-factor calculation (simplified)
  let r;
  if (effectiveLatency < 160) {
    r = 93.2 - (effectiveLatency / 40);
  } else {
    r = 93.2 - ((effectiveLatency - 120) / 10);
  }

  // Subtract packet loss impact
  r = r - (packetLossPercent * 2.5);

  // Clamp R-factor
  r = Math.max(0, Math.min(100, r));

  // Convert R-factor to MOS
  if (r < 0) return 1.0;
  if (r > 100) return 4.5;
  return 1 + (0.035 * r) + (r * (r - 60) * (100 - r) * 0.000007);
}
```

## Server-Side SBC Metrics

The Session Border Controller sees all calls and has accurate quality data. Instrument it to report aggregate metrics.

```python
# sbc_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter("ucaas.sbc")

# Active call gauge
active_calls = meter.create_up_down_counter(
    "ucaas.sbc.active_calls",
    description="Number of active calls through the SBC",
    unit="{call}",
)

# Call quality distribution from RTCP reports
sbc_mos = meter.create_histogram(
    "ucaas.sbc.mos",
    description="MOS scores from RTCP-XR reports",
    unit="{score}",
)

# SBC resource utilization
sbc_cpu = meter.create_gauge(
    "ucaas.sbc.cpu_utilization",
    description="SBC CPU utilization",
    unit="%",
)

sbc_sessions_capacity = meter.create_gauge(
    "ucaas.sbc.session_capacity_used",
    description="Percentage of SBC session capacity in use",
    unit="%",
)

# Track call failures by SIP cause code
call_failures = meter.create_counter(
    "ucaas.sbc.call_failures",
    description="Call failures by SIP response code",
    unit="{call}",
)


def process_rtcp_xr(report, call_id: str, sbc_instance: str):
    """Process RTCP-XR (Extended Reports) for call quality metrics."""
    attrs = {
        "ucaas.call_id": call_id,
        "ucaas.sbc.instance": sbc_instance,
        "ucaas.codec": report.codec,
    }

    if report.mos_lq:
        sbc_mos.record(report.mos_lq, {**attrs, "mos_type": "listening"})
    if report.mos_cq:
        sbc_mos.record(report.mos_cq, {**attrs, "mos_type": "conversational"})
```

## Alerting Strategy

For UCaaS platforms, quality alerts need to be fast and actionable:

- **Average MOS drops below 3.5 for 5 minutes**: Quality is degrading. Check network path and SBC load.
- **Packet loss exceeds 3%**: Audio will start to sound choppy. Often a network congestion issue.
- **Jitter exceeds 30ms**: The jitter buffer is likely being exceeded. Check for network path changes.
- **SBC capacity above 80%**: Time to scale or redirect traffic to another SBC.
- **Codec downgrade rate spikes**: Clients are falling back to lower-quality codecs, indicating bandwidth constraints.

## Correlating Client and Server Metrics

The real power of this setup is correlating client-reported quality with server-side data. If a user reports poor call quality, you can compare their client-side MOS with the SBC's view of the same call. If they diverge, the problem is likely in the last mile (the user's local network). If they agree, the issue is in your infrastructure. This distinction saves hours of troubleshooting time and lets you direct users to the right support path immediately.

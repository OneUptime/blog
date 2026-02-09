# How to Instrument Live Event Streaming Infrastructure (WebRTC/HLS/DASH) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, WebRTC, HLS, DASH, Live Streaming

Description: Instrument live event streaming infrastructure across WebRTC, HLS, and DASH protocols using OpenTelemetry for full observability.

Live event streaming demands reliability at a level that recorded content does not. When a sports match, concert, or product launch is happening in real time, there is no retry. If your infrastructure drops frames, introduces latency spikes, or fails to scale, viewers leave and do not come back. Instrumenting WebRTC, HLS, and DASH streaming infrastructure with OpenTelemetry gives your operations team the real-time visibility needed to keep things running smoothly.

## Protocol Differences Matter for Monitoring

Each streaming protocol has different performance characteristics:

- **WebRTC**: Ultra-low latency (sub-second), peer-to-peer or SFU-based. Sensitive to packet loss and jitter.
- **HLS**: Segment-based, higher latency (6-30 seconds), but extremely scalable through CDN caching. LL-HLS reduces latency to 2-4 seconds.
- **DASH**: Similar to HLS in architecture, segment-based with CDN delivery. CMAF low-latency mode available.

Your instrumentation needs to account for these differences.

## Common Metrics Across All Protocols

```python
from opentelemetry import trace, metrics

tracer = trace.get_tracer("livestream.infra", "1.0.0")
meter = metrics.get_meter("livestream.infra.metrics", "1.0.0")

# Viewer count (updated periodically)
concurrent_viewers = meter.create_observable_gauge(
    name="livestream.viewers.concurrent",
    description="Number of concurrent viewers across all streams",
    callbacks=[lambda result: report_viewer_counts(result)],
)

# Ingest health
ingest_bitrate = meter.create_histogram(
    name="livestream.ingest.bitrate",
    description="Incoming bitrate from the broadcaster",
    unit="kbps",
)

ingest_frame_drops = meter.create_counter(
    name="livestream.ingest.frame_drops",
    description="Number of dropped frames at the ingest point",
)

# Segment generation (HLS/DASH)
segment_generation_latency = meter.create_histogram(
    name="livestream.segment.generation_latency",
    description="Time to generate a media segment after receiving frames",
    unit="ms",
)

# Error rates
stream_errors = meter.create_counter(
    name="livestream.errors",
    description="Streaming errors by type and protocol",
)
```

## Instrumenting WebRTC SFU (Selective Forwarding Unit)

WebRTC streams through an SFU require monitoring at the connection level.

```javascript
const { trace, metrics } = require("@opentelemetry/api");

const tracer = trace.getTracer("webrtc.sfu", "1.0.0");
const meter = metrics.getMeter("webrtc.sfu.metrics", "1.0.0");

const rtpPacketLoss = meter.createHistogram("webrtc.rtp.packet_loss_ratio", {
  description: "RTP packet loss ratio per connection",
});

const rtpJitter = meter.createHistogram("webrtc.rtp.jitter", {
  description: "RTP jitter measured at the SFU",
  unit: "ms",
});

const connectionDuration = meter.createHistogram("webrtc.connection.duration", {
  description: "Duration of WebRTC connections",
  unit: "s",
});

const nackCount = meter.createCounter("webrtc.nack.count", {
  description: "NACK packets sent requesting retransmission",
});

const pliCount = meter.createCounter("webrtc.pli.count", {
  description: "Picture Loss Indication packets sent",
});

// Monitor each peer connection through the SFU
function instrumentPeerConnection(peerId, streamId, connection) {
  const attrs = {
    "peer.id": peerId,
    "stream.id": streamId,
    "protocol": "webrtc",
  };

  const connectionStart = Date.now();

  // Poll stats periodically from the peer connection
  const statsInterval = setInterval(async () => {
    const stats = await connection.getStats();

    stats.forEach((report) => {
      if (report.type === "inbound-rtp" && report.kind === "video") {
        // Calculate packet loss ratio
        const totalPackets = report.packetsReceived + report.packetsLost;
        if (totalPackets > 0) {
          const lossRatio = report.packetsLost / totalPackets;
          rtpPacketLoss.record(lossRatio, attrs);
        }

        // Record jitter
        if (report.jitter !== undefined) {
          rtpJitter.record(report.jitter * 1000, attrs);
        }

        // Track retransmission requests
        if (report.nackCount) {
          nackCount.add(report.nackCount, attrs);
        }
        if (report.pliCount) {
          pliCount.add(report.pliCount, attrs);
        }
      }
    });
  }, 5000);

  // On disconnect, record connection duration
  connection.onconnectionstatechange = () => {
    if (connection.connectionState === "closed" ||
        connection.connectionState === "failed") {
      clearInterval(statsInterval);
      const duration = (Date.now() - connectionStart) / 1000;
      connectionDuration.record(duration, attrs);

      if (connection.connectionState === "failed") {
        stream_errors_counter.add(1, {
          ...attrs,
          "error.type": "connection_failed",
        });
      }
    }
  };
}
```

## Instrumenting HLS/DASH Segment Publishing

For segment-based protocols, the critical path is from frame capture to segment availability on the CDN.

```python
def process_and_publish_segment(segment_data, stream_id, sequence_number):
    """Process incoming frames into an HLS/DASH segment and publish."""
    with tracer.start_as_current_span("livestream.segment.publish") as span:
        start = time.time()

        span.set_attribute("stream.id", stream_id)
        span.set_attribute("segment.sequence", sequence_number)
        span.set_attribute("protocol", "hls")

        # Mux frames into a segment
        with tracer.start_as_current_span("livestream.segment.mux") as mux_span:
            segment = mux_segment(segment_data)
            mux_span.set_attribute("segment.duration_s", segment.duration)
            mux_span.set_attribute("segment.size_bytes", segment.size)

        # Encrypt if DRM is enabled
        with tracer.start_as_current_span("livestream.segment.encrypt") as enc_span:
            if stream_requires_drm(stream_id):
                encrypted_segment = encrypt_segment(segment, stream_id)
                enc_span.set_attribute("drm.enabled", True)
            else:
                encrypted_segment = segment
                enc_span.set_attribute("drm.enabled", False)

        # Upload to origin/CDN
        with tracer.start_as_current_span("livestream.segment.upload") as up_span:
            cdn_url = upload_segment(encrypted_segment, stream_id, sequence_number)
            up_span.set_attribute("cdn.url", cdn_url)

        # Update the playlist/manifest
        with tracer.start_as_current_span("livestream.manifest.update") as man_span:
            update_manifest(stream_id, sequence_number, segment.duration)
            man_span.set_attribute("manifest.updated", True)

        elapsed_ms = (time.time() - start) * 1000
        segment_generation_latency.record(elapsed_ms, {
            "stream_id": stream_id,
            "protocol": "hls",
        })

        span.set_attribute("segment.publish_latency_ms", elapsed_ms)
```

## Monitoring Origin Server Load

The origin server handles manifest requests and segment requests from CDN edge nodes. Its performance directly affects stream availability.

```python
origin_request_latency = meter.create_histogram(
    name="livestream.origin.request_latency",
    description="Latency of requests to the origin server",
    unit="ms",
)

origin_requests = meter.create_counter(
    name="livestream.origin.requests",
    description="Total requests to the origin server",
)

def handle_origin_request(request):
    with tracer.start_as_current_span("livestream.origin.request") as span:
        start = time.time()
        request_type = "manifest" if request.path.endswith(".m3u8") else "segment"

        span.set_attribute("request.type", request_type)
        span.set_attribute("request.path", request.path)

        response = serve_content(request)

        elapsed_ms = (time.time() - start) * 1000
        attrs = {"request_type": request_type}
        origin_request_latency.record(elapsed_ms, attrs)
        origin_requests.add(1, attrs)

        return response
```

## Scaling Metrics for Live Events

During large events, auto-scaling needs data to make good decisions.

```python
# Track capacity utilization
encoder_utilization = meter.create_observable_gauge(
    name="livestream.encoder.utilization",
    description="Percentage of encoder capacity in use",
    callbacks=[lambda result: report_encoder_utilization(result)],
)

edge_bandwidth = meter.create_histogram(
    name="livestream.edge.bandwidth",
    description="Bandwidth served by each edge node",
    unit="Mbps",
)
```

## Dashboard Essentials for Live Events

- **Concurrent viewers**: The headline number. Show it big. Break it down by stream, region, and protocol.
- **Ingest health**: Bitrate stability and frame drops from the broadcaster. A dropping ingest bitrate means the source is struggling.
- **Segment publish latency**: For HLS/DASH, this is the segment generation to CDN availability time. It directly controls stream latency.
- **WebRTC quality**: Packet loss and jitter distributions. If packet loss exceeds 2%, viewers will see artifacts.
- **Origin server load**: Request rate and latency. If the origin is overloaded, CDN cache misses become catastrophic.
- **Error rate by protocol**: Different protocols fail differently. WebRTC connection failures, HLS 404s on segments, DASH manifest parse errors.

## Alerting for Live Events

- Concurrent viewer count dropping suddenly (could indicate a delivery failure)
- Ingest bitrate dropping below minimum threshold
- Segment publish latency exceeding target (e.g., 1 second for LL-HLS)
- WebRTC packet loss exceeding 3% for more than 30 seconds
- Origin request latency p95 exceeding 200ms
- Any stream showing zero viewers after previously having viewers (possible stream failure)

Live event streaming is high-stakes operational work. OpenTelemetry gives you the instrumentation layer to build war-room dashboards that show exactly what is happening across every protocol, every edge location, and every viewer session. When something goes wrong during a live event, those seconds of faster diagnosis translate directly into revenue and reputation preserved.

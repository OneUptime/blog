# How to Monitor Video Player Buffering, Rebuffering, and Start-Up Time with OpenTelemetry Browser SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Video Player, Browser SDK, Buffering Metrics

Description: Use the OpenTelemetry Browser SDK to monitor video player buffering, rebuffering events, and start-up time in production.

Video player performance is the most direct measure of viewer experience. Three metrics matter above all others: how long it takes for the video to start playing, how often playback stalls for buffering, and how long those stalls last. The OpenTelemetry Browser SDK lets you capture all of this from real user sessions and send it to your observability backend.

## Setting Up OpenTelemetry in the Browser

First, initialize the OpenTelemetry SDK in your web application.

```javascript
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { trace, metrics } from "@opentelemetry/api";

// Set up tracing
const traceExporter = new OTLPTraceExporter({
  url: "https://otel-collector.example.com/v1/traces",
});

const tracerProvider = new WebTracerProvider();
tracerProvider.addSpanProcessor(new BatchSpanProcessor(traceExporter));
tracerProvider.register();

// Set up metrics
const metricExporter = new OTLPMetricExporter({
  url: "https://otel-collector.example.com/v1/metrics",
});

const meterProvider = new MeterProvider({
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 15000,
    }),
  ],
});

metrics.setGlobalMeterProvider(meterProvider);

const tracer = trace.getTracer("video.player", "1.0.0");
const meter = metrics.getMeter("video.player.metrics", "1.0.0");
```

## Defining Player Metrics

```javascript
// Histogram for time to first frame (start-up time)
const startupTime = meter.createHistogram("player.startup.time", {
  description: "Time from play intent to first frame rendered",
  unit: "ms",
});

// Counter for rebuffering events
const rebufferCount = meter.createCounter("player.rebuffer.count", {
  description: "Number of rebuffering events during playback",
});

// Histogram for rebuffering duration
const rebufferDuration = meter.createHistogram("player.rebuffer.duration", {
  description: "Duration of each rebuffering event",
  unit: "ms",
});

// Histogram for total rebuffering ratio (rebuffer time / watch time)
const rebufferRatio = meter.createHistogram("player.rebuffer.ratio", {
  description: "Ratio of time spent rebuffering to total watch time",
});

// Counter for playback errors
const playbackErrors = meter.createCounter("player.errors", {
  description: "Number of playback errors encountered",
});
```

## Measuring Video Start-Up Time

Start-up time is the interval between the user clicking play and the first video frame appearing on screen. This includes DNS resolution, connection setup, manifest download, initial segment download, and decoder initialization.

```javascript
class VideoPlayerMonitor {
  constructor(videoElement, contentId) {
    this.video = videoElement;
    this.contentId = contentId;
    this.sessionId = generateSessionId();
    this.playIntentTime = null;
    this.firstFrameTime = null;
    this.isBuffering = false;
    this.bufferStartTime = null;
    this.totalRebufferTime = 0;
    this.rebufferEvents = 0;
    this.watchStartTime = null;

    this.commonAttrs = {
      "content.id": contentId,
      "session.id": this.sessionId,
      "player.type": this.detectPlayerType(),
      "device.type": this.detectDeviceType(),
      "connection.type": navigator.connection?.effectiveType || "unknown",
    };

    this.attachListeners();
  }

  attachListeners() {
    // User initiates playback
    this.video.addEventListener("play", () => {
      this.playIntentTime = performance.now();
      this.playSpan = tracer.startSpan("player.startup", {
        attributes: this.commonAttrs,
      });
    });

    // First frame is rendered and playback begins
    this.video.addEventListener("playing", () => {
      if (this.playIntentTime && !this.firstFrameTime) {
        this.firstFrameTime = performance.now();
        const startup = this.firstFrameTime - this.playIntentTime;

        startupTime.record(startup, this.commonAttrs);

        if (this.playSpan) {
          this.playSpan.setAttribute("startup.duration_ms", startup);
          this.playSpan.end();
        }

        this.watchStartTime = performance.now();
      }

      // If we were rebuffering, this means rebuffering ended
      if (this.isBuffering) {
        this.endRebuffer();
      }
    });

    // Player is waiting for data (rebuffering)
    this.video.addEventListener("waiting", () => {
      // Only count as rebuffering if we have already started playing
      if (this.firstFrameTime && !this.isBuffering) {
        this.startRebuffer();
      }
    });

    // Playback can continue (buffer recovered)
    this.video.addEventListener("canplay", () => {
      if (this.isBuffering) {
        this.endRebuffer();
      }
    });

    // Playback error occurred
    this.video.addEventListener("error", () => {
      const error = this.video.error;
      playbackErrors.add(1, {
        ...this.commonAttrs,
        "error.code": error ? error.code : 0,
        "error.message": error ? error.message : "unknown",
      });
    });

    // Session ended
    this.video.addEventListener("ended", () => this.recordSessionMetrics());
    this.video.addEventListener("pause", () => {
      // Only record if the user paused after significant watch time
      if (this.getWatchTime() > 5000) {
        this.recordSessionMetrics();
      }
    });
  }

  startRebuffer() {
    this.isBuffering = true;
    this.bufferStartTime = performance.now();
    this.currentBufferSpan = tracer.startSpan("player.rebuffer", {
      attributes: {
        ...this.commonAttrs,
        "rebuffer.playback_position_s": this.video.currentTime,
      },
    });
  }

  endRebuffer() {
    if (!this.bufferStartTime) return;

    const duration = performance.now() - this.bufferStartTime;
    this.totalRebufferTime += duration;
    this.rebufferEvents++;

    rebufferCount.add(1, this.commonAttrs);
    rebufferDuration.record(duration, this.commonAttrs);

    if (this.currentBufferSpan) {
      this.currentBufferSpan.setAttribute("rebuffer.duration_ms", duration);
      this.currentBufferSpan.end();
    }

    this.isBuffering = false;
    this.bufferStartTime = null;
  }

  getWatchTime() {
    if (!this.watchStartTime) return 0;
    return performance.now() - this.watchStartTime;
  }

  recordSessionMetrics() {
    const watchTime = this.getWatchTime();
    if (watchTime <= 0) return;

    const ratio = this.totalRebufferTime / watchTime;
    rebufferRatio.record(ratio, this.commonAttrs);
  }

  detectPlayerType() {
    if (this.video.canPlayType('application/vnd.apple.mpegurl')) return "native-hls";
    return "mse";
  }

  detectDeviceType() {
    const ua = navigator.userAgent;
    if (/Mobile|Android/.test(ua)) return "mobile";
    if (/Tablet|iPad/.test(ua)) return "tablet";
    return "desktop";
  }
}
```

## Using the Monitor

Integrate the monitor whenever you set up a video player instance.

```javascript
const videoEl = document.querySelector("video");
const monitor = new VideoPlayerMonitor(videoEl, "episode-12345");

// The monitor automatically tracks all events from this point forward
videoEl.src = "https://cdn.example.com/stream/manifest.m3u8";
```

## Tracking Buffer Health Proactively

Instead of only reacting to rebuffer events, you can monitor the buffer level continuously to predict problems before they happen.

```javascript
const bufferHealth = meter.createHistogram("player.buffer.health", {
  description: "Current buffer level in seconds ahead of playback position",
  unit: "s",
});

// Sample buffer health every 2 seconds during playback
setInterval(() => {
  if (videoEl.readyState >= 3 && !videoEl.paused) {
    const buffered = videoEl.buffered;
    const currentTime = videoEl.currentTime;

    // Find the buffer range that contains the current position
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
        const bufferAhead = buffered.end(i) - currentTime;
        bufferHealth.record(bufferAhead, monitor.commonAttrs);
        break;
      }
    }
  }
}, 2000);
```

## Dashboard Essentials

Build a dashboard with these panels:

- **Start-up time distribution**: p50, p75, p95 of `player.startup.time`. Target under 2 seconds at p50.
- **Rebuffer rate**: Percentage of sessions that experienced at least one rebuffer event. Industry target is under 1%.
- **Rebuffer duration distribution**: How long rebuffers last. Brief stalls (under 500ms) are less disruptive than multi-second ones.
- **Rebuffer ratio by connection type**: Segment by `connection.type` to see if 3G users are disproportionately affected.
- **Buffer health over time**: If median buffer health drops below 3 seconds, your CDN or bitrate selection might need tuning.
- **Error rate by device type**: Different devices have different codec support and failure modes.

## Alerting

- Start-up time p95 exceeding 5 seconds
- Rebuffer rate exceeding 2% of sessions in a 10-minute window
- Playback error rate spiking above baseline
- Buffer health p25 dropping below 1 second

These browser-side metrics give you the ground truth of viewer experience. Server-side metrics tell you what you delivered; player-side metrics tell you what the viewer actually received.

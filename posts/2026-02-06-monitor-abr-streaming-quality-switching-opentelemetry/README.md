# How to Monitor Adaptive Bitrate (ABR) Streaming Quality Switching Events with OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, ABR Streaming, Video Quality, Metrics

Description: Monitor adaptive bitrate streaming quality switches and viewer experience degradation with OpenTelemetry metrics.

Adaptive bitrate streaming is what keeps video playback smooth when network conditions change. The player dynamically switches between quality levels based on available bandwidth. But too many switches, or switches to very low quality, indicate a poor viewer experience. Monitoring these events with OpenTelemetry lets you understand quality of experience at scale.

## What ABR Switching Tells You

Every quality switch is a signal. An upswitch means the player detected more bandwidth and can show a better picture. A downswitch means the network is congested and the player is trying to avoid buffering. Frequent switching in both directions (oscillation) is often worse than staying at a lower quality, because the constant changes are visually distracting.

## Defining ABR Metrics

Start by defining the metrics you need to capture from the player.

```javascript
const { metrics } = require("@opentelemetry/api");

const meter = metrics.getMeter("abr.player.metrics", "1.0.0");

// Counter for quality switch events
const qualitySwitchCounter = meter.createCounter("abr.quality.switches", {
  description: "Number of ABR quality switch events",
});

// Histogram for the bitrate the player is currently rendering
const currentBitrate = meter.createHistogram("abr.current.bitrate", {
  description: "Current playback bitrate in kbps",
  unit: "kbps",
});

// Histogram for time spent at each quality level
const qualityDuration = meter.createHistogram("abr.quality.duration", {
  description: "Duration spent at a given quality level before switching",
  unit: "s",
});

// Counter for switches that go down in quality
const downswitchCounter = meter.createCounter("abr.quality.downswitches", {
  description: "Number of quality downswitches indicating degradation",
});

// Gauge tracking the current quality score (0-100)
const qualityScore = meter.createObservableGauge("abr.quality.score", {
  description: "Composite quality score based on current bitrate and stability",
});
```

## Hooking into the Video Player

Most video players (hls.js, dash.js, Shaka Player) emit events when the quality level changes. Here is an example with hls.js.

```javascript
import Hls from "hls.js";

const hls = new Hls();
let lastQualityLevel = null;
let lastSwitchTime = Date.now();
let switchHistory = [];

hls.on(Hls.Events.LEVEL_SWITCHED, function (event, data) {
  const newLevel = hls.levels[data.level];
  const now = Date.now();

  const commonAttrs = {
    "stream.id": getStreamId(),
    "player.session_id": getSessionId(),
    "player.region": getUserRegion(),
  };

  if (lastQualityLevel !== null) {
    const previousLevel = hls.levels[lastQualityLevel];
    const durationAtPrevious = (now - lastSwitchTime) / 1000;

    // Record how long we stayed at the previous quality
    qualityDuration.record(durationAtPrevious, {
      ...commonAttrs,
      "quality.level": previousLevel.height + "p",
      "quality.bitrate_kbps": Math.round(previousLevel.bitrate / 1000),
    });

    // Determine if this was an upswitch or downswitch
    const direction = newLevel.bitrate > previousLevel.bitrate ? "up" : "down";

    qualitySwitchCounter.add(1, {
      ...commonAttrs,
      "switch.direction": direction,
      "switch.from": previousLevel.height + "p",
      "switch.to": newLevel.height + "p",
    });

    if (direction === "down") {
      downswitchCounter.add(1, {
        ...commonAttrs,
        "switch.from": previousLevel.height + "p",
        "switch.to": newLevel.height + "p",
      });
    }

    // Track switch history for oscillation detection
    switchHistory.push({
      time: now,
      direction: direction,
      toBitrate: newLevel.bitrate,
    });

    // Keep only last 60 seconds of history
    switchHistory = switchHistory.filter((s) => now - s.time < 60000);
  }

  // Record the current bitrate
  currentBitrate.record(Math.round(newLevel.bitrate / 1000), commonAttrs);

  lastQualityLevel = data.level;
  lastSwitchTime = now;
});
```

## Detecting Quality Oscillation

Rapid switching back and forth is a sign of ABR algorithm instability or borderline bandwidth conditions. Track this as a distinct metric.

```javascript
const oscillationCounter = meter.createCounter("abr.quality.oscillations", {
  description: "Detected quality oscillation events in a rolling window",
});

function detectOscillation() {
  // Look for direction changes in recent switch history
  if (switchHistory.length < 3) return;

  const recent = switchHistory.slice(-5);
  let directionChanges = 0;

  for (let i = 1; i < recent.length; i++) {
    if (recent[i].direction !== recent[i - 1].direction) {
      directionChanges++;
    }
  }

  // If most recent switches alternate direction, that is oscillation
  if (directionChanges >= 3) {
    oscillationCounter.add(1, {
      "stream.id": getStreamId(),
      "player.session_id": getSessionId(),
      "oscillation.switches_in_window": recent.length,
    });
  }
}

// Run oscillation detection after each switch
hls.on(Hls.Events.LEVEL_SWITCHED, detectOscillation);
```

## Computing a Composite Quality Score

A single number that summarizes the viewing experience is useful for dashboards and alerts.

```javascript
function computeQualityScore() {
  const maxBitrate = Math.max(...hls.levels.map((l) => l.bitrate));
  const current = hls.levels[hls.currentLevel]?.bitrate || 0;

  // Bitrate component: what percentage of max quality are we at
  const bitrateScore = (current / maxBitrate) * 100;

  // Stability component: penalize for recent switches
  const recentSwitches = switchHistory.filter(
    (s) => Date.now() - s.time < 30000
  ).length;
  const stabilityPenalty = Math.min(recentSwitches * 10, 50);

  // Downswitch penalty: extra penalty for recent downswitches
  const recentDownswitches = switchHistory.filter(
    (s) => Date.now() - s.time < 30000 && s.direction === "down"
  ).length;
  const downswitchPenalty = recentDownswitches * 15;

  return Math.max(0, bitrateScore - stabilityPenalty - downswitchPenalty);
}

// Register the observable gauge callback
qualityScore.addCallback((result) => {
  result.observe(computeQualityScore(), {
    "stream.id": getStreamId(),
    "player.session_id": getSessionId(),
  });
});
```

## Dashboard Recommendations

Build dashboards that track:

- **Switch frequency per session**: High switch rates correlate with poor experience. Plot the distribution of switches-per-minute across all sessions.
- **Downswitch ratio**: What fraction of switches are downswitches? A healthy stream should have mostly upswitches during the initial ramp-up and few switches after stabilizing.
- **Time at each quality level**: A stacked area chart showing how much viewing time is spent at each resolution gives a clear picture of your delivery quality.
- **Oscillation rate by region**: If oscillation spikes in a specific geography, it probably points to CDN capacity issues in that region.
- **Quality score distribution**: Plot the p25, p50, and p75 of the composite quality score. If p25 is below 40, a quarter of your viewers are having a bad time.

## Alerting Strategy

Set alerts for:

- Average downswitch rate exceeding a threshold across all sessions in a 5-minute window
- Oscillation event count spiking above baseline (usually indicates a systemic network issue)
- Quality score p25 dropping below a minimum acceptable threshold

These metrics turn the black box of ABR player behavior into actionable data. Instead of waiting for user complaints about video quality, you can see degradation as it happens and identify the root cause, whether it is CDN capacity, encoder output issues, or player algorithm tuning.

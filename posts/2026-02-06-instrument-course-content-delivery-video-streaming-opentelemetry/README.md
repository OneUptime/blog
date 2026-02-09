# How to Instrument Course Content Delivery and Video Streaming for EdTech Platforms with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, EdTech, Video Streaming, Content Delivery

Description: Instrument course content delivery and video streaming pipelines for EdTech platforms with OpenTelemetry tracing and metrics.

EdTech platforms serve a mix of content types: video lectures, interactive quizzes, PDFs, SCORM packages, and live streams. Each has different delivery characteristics and failure modes. A buffering video lecture or a slow-loading interactive module directly impacts the learning experience. This post shows how to instrument your content delivery pipeline with OpenTelemetry to get full visibility into how content reaches learners.

## Content Delivery Architecture

A typical EdTech platform delivers content through multiple paths:

- Pre-recorded video goes through a transcoding pipeline, then a CDN
- Interactive content loads from application servers
- Documents and slides are served from object storage via CDN
- Live streams go through a media server with adaptive bitrate encoding

Each path needs different instrumentation strategies.

## Instrumenting Video Transcoding Pipeline

When an instructor uploads a video, it goes through transcoding to produce multiple quality levels. This pipeline can take minutes, and failures here mean content is unavailable:

```python
from opentelemetry import trace, metrics

tracer = trace.get_tracer("content.transcoding")
meter = metrics.get_meter("content.transcoding")

transcode_duration = meter.create_histogram(
    "content.transcode_duration_seconds",
    description="Time to transcode a video to a specific quality",
    unit="s",
)

transcode_errors = meter.create_counter(
    "content.transcode_errors_total",
    description="Total number of transcoding failures",
)

def transcode_video(video_id, course_id, source_url, target_qualities):
    """Transcode an uploaded video into multiple quality levels."""
    with tracer.start_as_current_span(
        "content.transcode_video",
        attributes={
            "content.video_id": video_id,
            "content.course_id": course_id,
            "content.target_qualities": str(target_qualities),
        }
    ) as parent_span:
        results = []

        for quality in target_qualities:
            with tracer.start_as_current_span(
                f"content.transcode_{quality}",
                attributes={
                    "content.video_id": video_id,
                    "content.target_quality": quality,
                    "content.target_resolution": get_resolution(quality),
                    "content.target_bitrate": get_bitrate(quality),
                }
            ) as span:
                import time
                start = time.time()

                try:
                    output_url = run_ffmpeg_transcode(
                        source_url, quality
                    )
                    duration = time.time() - start

                    span.set_attribute("content.output_url", output_url)
                    span.set_attribute("content.transcode_seconds", duration)

                    transcode_duration.record(duration, {
                        "content.quality": quality,
                    })

                    results.append({"quality": quality, "url": output_url})

                except Exception as e:
                    transcode_errors.add(1, {"content.quality": quality})
                    span.set_status(trace.StatusCode.ERROR, str(e))
                    span.record_exception(e)
                    raise

        parent_span.set_attribute("content.qualities_completed", len(results))
        return results
```

## Monitoring Video Playback on the Client

Once video is available, monitor the playback experience from the student's browser:

```javascript
const { trace, metrics } = require('@opentelemetry/api');

const tracer = trace.getTracer('content.playback');
const meter = metrics.getMeter('content.playback');

const bufferingCounter = meter.createCounter('content.buffering_events', {
  description: 'Number of buffering events during video playback',
});

const startupLatency = meter.createHistogram('content.video_startup_ms', {
  description: 'Time from play click to first frame rendered',
  unit: 'ms',
});

function instrumentVideoPlayer(player, contentMetadata) {
  const baseAttributes = {
    'content.course_id': contentMetadata.courseId,
    'content.video_id': contentMetadata.videoId,
    'content.cdn_provider': contentMetadata.cdnProvider,
  };

  let playClickTime = null;

  // Track time to first frame
  player.on('play', () => {
    playClickTime = performance.now();
  });

  player.on('playing', () => {
    if (playClickTime) {
      const startup = performance.now() - playClickTime;
      startupLatency.record(startup, baseAttributes);
      playClickTime = null;
    }
  });

  // Track buffering events
  player.on('waiting', () => {
    bufferingCounter.add(1, {
      ...baseAttributes,
      'content.playback_position': Math.floor(player.currentTime),
      'content.quality_level': player.currentQuality,
    });
  });

  // Track quality switches (adaptive bitrate adjustments)
  player.on('qualitychange', (event) => {
    const span = tracer.startSpan('content.quality_switch', {
      attributes: {
        ...baseAttributes,
        'content.quality_from': event.previousQuality,
        'content.quality_to': event.newQuality,
        'content.switch_reason': event.reason,
      },
    });
    span.end();
  });
}
```

## Tracking CDN Performance

Content delivery networks are the last mile for your content. Monitor cache hit rates and origin fetches:

```python
from opentelemetry import trace

tracer = trace.get_tracer("content.cdn")

def handle_content_request(request):
    """Middleware that tracks CDN-related metrics for content requests."""
    with tracer.start_as_current_span(
        "content.serve_request",
        attributes={
            "content.path": request.path,
            "content.type": get_content_type(request.path),
            "http.method": request.method,
        }
    ) as span:
        # Check if content is cached at edge
        cache_status = check_edge_cache(request.path)
        span.set_attribute("cdn.cache_status", cache_status)  # HIT, MISS, EXPIRED

        if cache_status == "HIT":
            span.set_attribute("cdn.served_from", "edge")
            return serve_from_cache(request.path)

        # Cache miss - fetch from origin
        with tracer.start_as_current_span(
            "content.origin_fetch",
            attributes={
                "cdn.origin_region": get_origin_region(),
                "content.path": request.path,
            }
        ) as origin_span:
            response = fetch_from_origin(request.path)
            origin_span.set_attribute("cdn.origin_latency_ms", response.latency_ms)

            # Cache for future requests
            cache_at_edge(request.path, response)

            return response
```

## Monitoring Interactive Content Loading

Interactive content like HTML5 modules and SCORM packages have their own loading patterns:

```javascript
const tracer = trace.getTracer('content.interactive');

async function loadInteractiveModule(moduleId, courseId) {
  return tracer.startActiveSpan('content.load_interactive', async (span) => {
    span.setAttribute('content.module_id', moduleId);
    span.setAttribute('content.course_id', courseId);
    span.setAttribute('content.type', 'interactive');

    // Load the module manifest
    const manifest = await fetchManifest(moduleId);
    span.setAttribute('content.asset_count', manifest.assets.length);
    span.setAttribute('content.total_size_kb', manifest.totalSizeKb);

    // Load all assets in parallel and track completion
    const loadStart = performance.now();
    await Promise.all(manifest.assets.map(asset => loadAsset(asset)));
    const loadDuration = performance.now() - loadStart;

    span.setAttribute('content.load_duration_ms', loadDuration);
    span.end();
  });
}
```

## Conclusion

Instrumenting content delivery for an EdTech platform means covering the full pipeline from upload and transcoding to CDN delivery and playback in the student's browser. By collecting metrics at each stage with OpenTelemetry, you can identify bottlenecks, improve cache hit rates, reduce buffering, and ultimately deliver a better learning experience.

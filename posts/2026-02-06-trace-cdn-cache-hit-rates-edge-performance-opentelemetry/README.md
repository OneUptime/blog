# How to Trace CDN Cache Hit Rates and Edge Server Performance Across Global PoPs with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CDN, Edge Computing, Performance Monitoring

Description: Track CDN cache hit rates and edge server performance across global points of presence using OpenTelemetry tracing and metrics.

Running a content delivery network or relying heavily on one means you need to understand where your content is being served from, how often caches are actually helping, and where latency hotspots exist. OpenTelemetry provides the primitives to build this visibility across every edge location in your network.

## The Challenge with CDN Observability

CDN performance is inherently distributed. A single user request might hit an edge PoP in Frankfurt, miss the cache, and fall back to your origin in Virginia. Traditional monitoring tools show you averages, but averages hide the reality that users in certain regions might be experiencing terrible performance while others are fine.

## Setting Up Edge-Level Instrumentation

At each edge server or CDN middleware layer, you need to record both traces and metrics. Here is a Node.js example for an edge handler.

```javascript
const { trace, metrics, context, SpanStatusCode } = require("@opentelemetry/api");

const tracer = trace.getTracer("cdn.edge.handler", "1.0.0");
const meter = metrics.getMeter("cdn.edge.metrics", "1.0.0");

// Define metrics for cache behavior
const cacheHitCounter = meter.createCounter("cdn.cache.hits", {
  description: "Number of cache hits at the edge",
});

const cacheMissCounter = meter.createCounter("cdn.cache.misses", {
  description: "Number of cache misses requiring origin fetch",
});

const responseLatency = meter.createHistogram("cdn.response.latency", {
  description: "Latency of responses served from edge",
  unit: "ms",
});

const originFetchLatency = meter.createHistogram("cdn.origin.fetch.latency", {
  description: "Latency of origin fetch on cache miss",
  unit: "ms",
});
```

## Instrumenting the Request Handler

The edge request handler is where you capture the full picture: was it a hit or miss, which PoP served it, and how long did it take.

```javascript
async function handleEdgeRequest(req, res) {
  const popId = process.env.POP_ID || "unknown";
  const region = process.env.POP_REGION || "unknown";

  return tracer.startActiveSpan("cdn.edge.request", async (span) => {
    const startTime = Date.now();

    // Set attributes about the edge location
    span.setAttribute("cdn.pop.id", popId);
    span.setAttribute("cdn.pop.region", region);
    span.setAttribute("http.url", req.url);
    span.setAttribute("cdn.content.type", getContentType(req.url));

    try {
      // Check the local cache first
      const cachedResponse = await localCache.get(req.url);

      if (cachedResponse) {
        // Cache hit path
        span.setAttribute("cdn.cache.status", "hit");
        span.setAttribute("cdn.cache.age", cachedResponse.age);
        cacheHitCounter.add(1, { pop: popId, region: region });

        const latency = Date.now() - startTime;
        responseLatency.record(latency, {
          pop: popId,
          cache_status: "hit",
          content_type: getContentType(req.url),
        });

        res.writeHead(200, cachedResponse.headers);
        res.end(cachedResponse.body);
      } else {
        // Cache miss - need to fetch from origin
        span.setAttribute("cdn.cache.status", "miss");
        cacheMissCounter.add(1, { pop: popId, region: region });

        const originResponse = await tracer.startActiveSpan(
          "cdn.origin.fetch",
          async (originSpan) => {
            const fetchStart = Date.now();
            originSpan.setAttribute("cdn.origin.url", getOriginUrl(req.url));

            const result = await fetchFromOrigin(req.url);

            const fetchLatency = Date.now() - fetchStart;
            originFetchLatency.record(fetchLatency, {
              pop: popId,
              origin: result.originServer,
            });

            originSpan.setAttribute("cdn.origin.latency_ms", fetchLatency);
            originSpan.end();
            return result;
          }
        );

        // Store in local cache for next time
        await localCache.set(req.url, originResponse, originResponse.ttl);

        const latency = Date.now() - startTime;
        responseLatency.record(latency, {
          pop: popId,
          cache_status: "miss",
          content_type: getContentType(req.url),
        });

        res.writeHead(200, originResponse.headers);
        res.end(originResponse.body);
      }
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      res.writeHead(502);
      res.end("Bad Gateway");
    } finally {
      span.end();
    }
  });
}
```

## Computing Cache Hit Ratio as a Derived Metric

While you can compute hit ratio in your dashboard tool, you can also emit it directly from each PoP using an observable gauge.

```javascript
// Track running counts per PoP for ratio calculation
let hitCount = 0;
let totalCount = 0;

// Reset counters every interval to keep the ratio fresh
const cacheHitRatio = meter.createObservableGauge("cdn.cache.hit_ratio", {
  description: "Cache hit ratio over the last reporting interval",
});

cacheHitRatio.addCallback((result) => {
  const ratio = totalCount > 0 ? hitCount / totalCount : 0;
  result.observe(ratio, {
    pop: process.env.POP_ID,
    region: process.env.POP_REGION,
  });

  // Reset for next interval
  hitCount = 0;
  totalCount = 0;
});
```

## Tracking Stale Content Serving

Sometimes edge servers serve stale content while revalidating in the background. This is important to track because it affects content freshness.

```javascript
const staleServeCounter = meter.createCounter("cdn.cache.stale_serves", {
  description: "Times stale content was served during revalidation",
});

async function serveWithRevalidation(req, cachedItem, popId) {
  if (cachedItem.isStale()) {
    staleServeCounter.add(1, {
      pop: popId,
      content_type: cachedItem.contentType,
      staleness_seconds: cachedItem.stalenessSeconds(),
    });

    // Serve stale content immediately
    // Trigger background revalidation
    revalidateInBackground(req.url, cachedItem.etag);
  }
}
```

## Correlating Across PoPs with Trace Context

When a cache miss triggers an origin fetch, the trace context propagates from edge to origin. This lets you see the full request path in your trace viewer.

If your CDN has a tiered architecture (edge PoP to regional cache to origin), each layer should propagate the trace context in the request headers. The W3C Trace Context headers (`traceparent` and `tracestate`) work well for this.

## Building the Global View

With metrics flowing from every PoP, you can build dashboards that show:

- **Cache hit ratio per PoP**: Identify which locations have poor cache efficiency. A PoP with low hit rates might have insufficient storage or serve a long-tail content mix.
- **Origin fetch latency by PoP**: Reveals which edge locations are furthest (in network terms) from your origin. This helps decide where to place regional caches.
- **Response latency heatmap**: Plot p50 and p95 latency on a world map colored by PoP region. Users and operations teams both find this valuable.
- **Stale serve rate**: If this climbs, your TTLs might be too aggressive or origin revalidation is slow.

## Alerting on CDN Degradation

Set alerts for situations like:

- Cache hit ratio dropping below 70% at any single PoP for more than 15 minutes
- Origin fetch latency p95 exceeding 500ms from any region
- Any PoP reporting zero traffic (might indicate a routing or DNS issue)

The combination of distributed tracing and custom metrics gives you a level of CDN visibility that most commercial CDN dashboards do not provide. You own the data, you define the dimensions, and you can correlate CDN behavior with your application traces end to end.

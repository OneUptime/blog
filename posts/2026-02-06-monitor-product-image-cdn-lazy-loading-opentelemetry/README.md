# How to Monitor Product Image CDN Performance and Lazy Loading with OpenTelemetry Browser SDK Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CDN Performance, Browser SDK, Lazy Loading

Description: Monitor product image CDN performance and lazy loading behavior using OpenTelemetry Browser SDK metrics in e-commerce frontends.

Product images are the heaviest assets on most e-commerce pages. A product listing page might load 40-60 images, and each one that loads slowly or fails directly hurts conversion rates. Lazy loading helps, but it introduces its own complexity: are images loading fast enough when they scroll into view? Are certain CDN edge locations underperforming? The OpenTelemetry Browser SDK gives you the visibility to answer these questions with real user data.

## Setting Up the Browser SDK

First, initialize the OpenTelemetry Web SDK with the resource detection and metric exporter configured for your backend.

```javascript
// otel-init.js
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';

const resource = new Resource({
  'service.name': 'product-catalog-frontend',
  'service.version': '2.4.1',
  'deployment.environment': 'production'
});

const metricExporter = new OTLPMetricExporter({
  url: 'https://otel-collector.yourstore.com/v1/metrics'
});

const meterProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 15000 // Export every 15 seconds
    })
  ]
});

export const meter = meterProvider.getMeter('product.images');
```

## Instrumenting Image Load Performance

Create a reusable observer that hooks into the browser's PerformanceObserver API to capture image load timing from the Resource Timing API.

```javascript
// image-metrics.js
import { meter } from './otel-init.js';

// Histogram for image load duration
const imageLoadDuration = meter.createHistogram('image.load.duration', {
  description: 'Time to load a product image from CDN',
  unit: 'ms',
  advice: {
    explicitBucketBoundaries: [50, 100, 200, 500, 1000, 2000, 5000]
  }
});

// Counter for image load failures
const imageLoadErrors = meter.createCounter('image.load.errors', {
  description: 'Number of product image load failures'
});

// Histogram for image transfer size
const imageTransferSize = meter.createHistogram('image.transfer.size', {
  description: 'Transfer size of product images',
  unit: 'bytes'
});

// Observe resource timing entries for images
function observeImagePerformance() {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Only track product images from our CDN
      if (!entry.name.includes('cdn.yourstore.com/products/')) continue;

      const cdnEdge = extractCdnEdge(entry.name);
      const imageType = extractImageType(entry.name);

      const attributes = {
        'cdn.edge': cdnEdge,
        'image.type': imageType, // thumbnail, gallery, zoom
        'image.format': entry.name.split('.').pop(),
        'cache.hit': entry.transferSize < entry.decodedBodySize * 0.1
      };

      // Record load duration (responseEnd - startTime)
      const duration = entry.responseEnd - entry.startTime;
      imageLoadDuration.record(duration, attributes);

      // Record transfer size
      if (entry.transferSize > 0) {
        imageTransferSize.record(entry.transferSize, attributes);
      }
    }
  });

  observer.observe({ type: 'resource', buffered: true });
}

function extractCdnEdge(url) {
  // CDN URLs often encode the edge in a query param or subdomain
  const match = url.match(/edge=([a-z]{3})/);
  return match ? match[1] : 'unknown';
}

function extractImageType(url) {
  if (url.includes('/thumb/')) return 'thumbnail';
  if (url.includes('/gallery/')) return 'gallery';
  if (url.includes('/zoom/')) return 'zoom';
  return 'other';
}

observeImagePerformance();
```

## Tracking Lazy Loading Behavior

Lazy loading means images only start fetching when they approach the viewport. You need to measure the gap between when a user scrolls to an image and when it finishes loading. If that gap is too long, users see blank placeholders.

```javascript
// lazy-load-metrics.js
import { meter } from './otel-init.js';

const lazyLoadLatency = meter.createHistogram('image.lazy_load.latency', {
  description: 'Time from image entering viewport to fully loaded',
  unit: 'ms',
  advice: {
    explicitBucketBoundaries: [100, 250, 500, 1000, 2000, 4000]
  }
});

const lazyLoadVisible = meter.createCounter('image.lazy_load.visible', {
  description: 'Images that entered the viewport'
});

class ProductImageObserver {
  constructor() {
    this.pendingImages = new Map(); // element -> timestamp
    this.intersectionObserver = new IntersectionObserver(
      (entries) => this.onIntersection(entries),
      { rootMargin: '200px' } // Match your lazy load trigger margin
    );
  }

  // Call this for each product image element on the page
  observe(imgElement) {
    this.intersectionObserver.observe(imgElement);
  }

  onIntersection(entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      const img = entry.target;
      const visibleTime = performance.now();
      this.pendingImages.set(img, visibleTime);

      lazyLoadVisible.add(1, {
        'page.type': this.getPageType(),
        'image.position': img.dataset.position || 'unknown'
      });

      // Listen for the image to finish loading
      if (img.complete) {
        this.recordLatency(img, visibleTime);
      } else {
        img.addEventListener('load', () => {
          this.recordLatency(img, visibleTime);
        }, { once: true });

        img.addEventListener('error', () => {
          this.pendingImages.delete(img);
          // Track the error through the image load errors counter
        }, { once: true });
      }

      // Stop observing once it enters viewport
      this.intersectionObserver.unobserve(img);
    }
  }

  recordLatency(img, visibleTime) {
    const loadedTime = performance.now();
    const latency = loadedTime - visibleTime;

    lazyLoadLatency.record(latency, {
      'page.type': this.getPageType(),
      'image.type': img.dataset.imageType || 'unknown',
      'image.was_cached': latency < 50 // Very fast loads are likely cached
    });

    this.pendingImages.delete(img);
  }

  getPageType() {
    if (location.pathname.includes('/product/')) return 'pdp';
    if (location.pathname.includes('/category/')) return 'plp';
    if (location.pathname === '/') return 'homepage';
    return 'other';
  }
}

// Usage in your product listing component
const imageObserver = new ProductImageObserver();
document.querySelectorAll('img[data-lazy]').forEach(img => {
  imageObserver.observe(img);
});
```

## What to Alert On

With these metrics flowing, set up alerts for the conditions that actually impact revenue:

- **p95 lazy load latency above 1 second on PLP**: Users scrolling through product listings will see blank tiles, which kills browsing engagement.
- **Image error rate above 2%**: Broken product images are one of the fastest ways to lose trust.
- **CDN cache hit rate dropping below 80%**: This usually means a deployment invalidated the cache or a CDN configuration changed unexpectedly.
- **p99 image load duration above 3 seconds for any single CDN edge**: This isolates regional CDN issues before they show up in aggregate metrics.

The combination of Resource Timing API data and Intersection Observer metrics gives you a complete picture of the image loading experience from the user's perspective, not just what the CDN reports in its own logs.

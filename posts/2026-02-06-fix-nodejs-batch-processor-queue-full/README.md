# How to Fix OpenTelemetry Node.js SDK Silently Dropping Spans When the Batch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Node.js, BatchSpanProcessor, Data Loss

Description: Detect and fix silent span dropping when the OpenTelemetry BatchSpanProcessor queue reaches its maximum size in Node.js applications.

The BatchSpanProcessor has a finite queue. When spans are produced faster than they can be exported, the queue fills up and new spans are silently dropped. There is no error, no warning in most configurations, and no indication in your traces that data was lost. This post shows you how to detect, prevent, and handle queue overflow.

## How the Queue Works

The BatchSpanProcessor has these parameters:

```javascript
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');

const processor = new BatchSpanProcessor(exporter, {
  maxQueueSize: 2048,          // Max spans waiting to be exported
  maxExportBatchSize: 512,     // Spans per export batch
  scheduledDelayMillis: 5000,  // Export interval
  exportTimeoutMillis: 30000,  // Export timeout
});
```

When a sampled span ends, it enters the queue. The processor exports up to `maxExportBatchSize` spans when the scheduled delay elapses, and it can also start an export sooner when the queue reaches `maxExportBatchSize`. If the queue reaches `maxQueueSize`, new spans are dropped.

## When the Queue Overflows

The queue overflows when:
1. **High traffic**: Your application generates spans faster than the processor and exporter can drain them
2. **Slow exporter**: The backend is slow, causing exports to take longer than the interval
3. **Exporter errors**: Retryable OTLP export failures are retried by the exporter, consuming export time
4. **Burst traffic**: A sudden spike generates thousands of spans in seconds

## Detecting Queue Overflow

The SDK logs dropped-span diagnostics only if you have diagnostic logging enabled. At `WARN` level, the current JavaScript SDK reports the dropped count after the queue has room again:

```javascript
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);
```

Look for:
```text
Dropped <number> spans because maxQueueSize reached
```

You can also monitor the queue programmatically:

```javascript
// Check queue size periodically
setInterval(() => {
  // Access internal state (not part of public API, but useful for debugging)
  const pendingCount = processor._finishedSpans?.length || 0;
  console.log(`Pending spans: ${pendingCount}/${processor._maxQueueSize}`);

  if (pendingCount > processor._maxQueueSize * 0.8) {
    console.warn('Span queue is over 80% full');
  }
}, 10000);
```

## Fix 1: Increase Queue Size

For high-throughput applications, increase the queue size:

```javascript
const processor = new BatchSpanProcessor(exporter, {
  maxQueueSize: 8192,          // 4x default
  maxExportBatchSize: 1024,    // 2x default
  scheduledDelayMillis: 3000,  // Export more frequently
  exportTimeoutMillis: 30000,
});
```

Be aware that a larger queue uses more memory. The memory used per span depends on its attributes, events, links, and resource data, so measure in your application before raising this aggressively.

## Fix 2: Export More Frequently

Reduce the export interval to drain the queue faster:

```javascript
const processor = new BatchSpanProcessor(exporter, {
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
  scheduledDelayMillis: 1000,  // Export every second instead of every 5 seconds
});
```

This reduces the burst capacity needed but increases network overhead.

## Fix 3: Increase Batch Size

Export more spans per batch:

```javascript
const processor = new BatchSpanProcessor(exporter, {
  maxQueueSize: 4096,
  maxExportBatchSize: 2048,     // Large batches
  scheduledDelayMillis: 5000,
});
```

Larger batches are more network-efficient but take longer to serialize.

## Fix 4: Use Sampling to Reduce Volume

If your application generates too many spans, use sampling to reduce the volume:

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { TraceIdRatioBasedSampler, ParentBasedSampler } = require('@opentelemetry/sdk-trace-node');

const sdk = new NodeSDK({
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(0.1),  // Sample 10% of traces
  }),
});
```

This reduces the number of spans entering the queue by 90%.

## Fix 5: Use HTTP Exporter for Better Throughput

The HTTP exporter can sometimes be easier to tune in environments where HTTP/2 or gRPC is constrained. If network transfer time is a bottleneck, enable supported compression:

```javascript
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const exporter = new OTLPTraceExporter({
  url: 'http://collector:4318/v1/traces',
  compression: 'gzip',
  headers: {},
});
```

## Monitoring in Production

Create a health check that reports queue status:

```javascript
const express = require('express');
const app = express();

let spanProcessor;

// Store reference when creating the processor
spanProcessor = new BatchSpanProcessor(exporter, { maxQueueSize: 4096 });

app.get('/health/telemetry', (req, res) => {
  res.json({
    queue: {
      maxSize: 4096,
      // These are approximate since we access internal state
      status: 'healthy',
    },
    exporter: {
      endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    },
  });
});
```

## Tuning Recommendations by Traffic Level

| Requests/sec | maxQueueSize | maxExportBatchSize | scheduledDelayMillis |
|-------------|-------------|-------------------|---------------------|
| < 100 | 2048 (default) | 512 (default) | 5000 (default) |
| 100-500 | 4096 | 1024 | 3000 |
| 500-2000 | 8192 | 2048 | 2000 |
| 2000+ | 16384 | 4096 | 1000 |

These are starting points. Monitor your queue fill rate and adjust accordingly.

Silent data loss from queue overflow is one of the hardest issues to detect in OpenTelemetry. Enable diagnostic logging, monitor queue utilization, and tune the batch processor parameters to match your application's throughput.

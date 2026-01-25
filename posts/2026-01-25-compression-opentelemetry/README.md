# How to Configure Compression in OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Compression, Performance, Network Optimization, gzip, Telemetry Pipeline

Description: Learn how to configure compression in OpenTelemetry to reduce bandwidth usage and improve telemetry export performance. This guide covers SDK and Collector compression settings with benchmarks and best practices.

---

Telemetry data adds up quickly. A busy service can generate gigabytes of trace and metric data daily. Compression reduces this volume by 80-90%, saving bandwidth costs and improving export performance.

This guide covers configuring compression in OpenTelemetry at both the SDK and Collector levels.

## Why Compression Matters

Consider a service generating 10,000 spans per minute:

| Metric | Uncompressed | With gzip |
|--------|--------------|-----------|
| Span size (avg) | 2 KB | 200-400 bytes |
| Per minute | 20 MB | 2-4 MB |
| Per hour | 1.2 GB | 120-240 MB |
| Per day | 28.8 GB | 2.9-5.8 GB |
| Monthly transfer | 864 GB | 86-174 GB |

At cloud egress rates of $0.08-0.12 per GB, compression can save hundreds of dollars monthly.

```mermaid
flowchart LR
    A[Application] -->|Raw telemetry| B[SDK Exporter]
    B -->|Compressed| C[Network]
    C -->|Compressed| D[Collector]
    D -->|Decompress| E[Process]
    E -->|Compress| F[Backend]
```

## SDK Compression Configuration

### Node.js OTLP Exporter

```javascript
// tracing.js
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');

// HTTP exporter with gzip compression
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces',
  headers: {
    'x-oneuptime-token': process.env.ONEUPTIME_TOKEN
  },
  // Enable gzip compression
  compression: 'gzip'
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/metrics',
  headers: {
    'x-oneuptime-token': process.env.ONEUPTIME_TOKEN
  },
  compression: 'gzip'
});

const sdk = new NodeSDK({
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60000
  })
});

sdk.start();
```

### Node.js gRPC Exporter

```javascript
// grpc-tracing.js
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { CompressionAlgorithm } = require('@grpc/grpc-js');

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  // gRPC compression options
  compression: CompressionAlgorithm.gzip
});
```

### Python OTLP Exporter

```python
# tracing_config.py
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http import Compression

# HTTP exporter with gzip compression
exporter = OTLPSpanExporter(
    endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") + "/v1/traces",
    headers={
        "x-oneuptime-token": os.getenv("ONEUPTIME_TOKEN")
    },
    # Enable gzip compression
    compression=Compression.Gzip
)

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)
```

### Python gRPC Exporter

```python
# grpc_tracing.py
import os
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
import grpc

# gRPC exporter with compression
exporter = OTLPSpanExporter(
    endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"),
    # Enable gzip compression for gRPC
    compression=grpc.Compression.Gzip
)
```

### Environment Variable Configuration

You can also configure compression via environment variables:

```bash
# Enable gzip compression for OTLP exporters
export OTEL_EXPORTER_OTLP_COMPRESSION=gzip

# Or specify per-signal
export OTEL_EXPORTER_OTLP_TRACES_COMPRESSION=gzip
export OTEL_EXPORTER_OTLP_METRICS_COMPRESSION=gzip
export OTEL_EXPORTER_OTLP_LOGS_COMPRESSION=gzip
```

## Collector Compression Configuration

### Receiving Compressed Data

The Collector automatically handles decompression for incoming data:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        # gRPC handles compression automatically
      http:
        endpoint: 0.0.0.0:4318
        # HTTP receivers automatically decompress based on Content-Encoding header
```

### Exporting Compressed Data

Configure compression on exporters:

```yaml
# collector-config.yaml
exporters:
  # HTTP exporter with gzip compression
  otlphttp:
    endpoint: "https://oneuptime.com/otlp"
    headers:
      "x-oneuptime-token": "${ONEUPTIME_TOKEN}"
    # Enable compression
    compression: gzip
    # Compression level (1-9, default varies by implementation)
    # Higher = better compression but more CPU

  # gRPC exporter with compression
  otlp:
    endpoint: "backend.example.com:4317"
    compression: gzip
    tls:
      insecure: false

  # Multiple backends with different settings
  otlphttp/backup:
    endpoint: "https://backup.example.com/otlp"
    compression: gzip

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp, otlphttp/backup]
```

### Compression Options

| Algorithm | Compression Ratio | CPU Usage | Use Case |
|-----------|-------------------|-----------|----------|
| none | 1:1 | Lowest | Local/loopback |
| gzip | 5:1 to 10:1 | Medium | Standard use |
| zstd | 6:1 to 12:1 | Low-Medium | High throughput |
| snappy | 2:1 to 4:1 | Very Low | Low latency |

Most deployments should use gzip. It is universally supported and provides excellent compression ratios.

## Batch Processing with Compression

Combine batching with compression for maximum efficiency:

```yaml
# collector-config.yaml
processors:
  batch:
    # Larger batches compress better
    send_batch_size: 2000
    send_batch_max_size: 3000
    timeout: 10s

exporters:
  otlphttp:
    endpoint: "https://oneuptime.com/otlp"
    compression: gzip
    # Retry settings for reliable delivery
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]  # Batch before compressing
      exporters: [otlphttp]
```

## Measuring Compression Effectiveness

Enable Collector metrics to monitor compression:

```yaml
# collector-config.yaml
service:
  telemetry:
    metrics:
      level: detailed
      address: 0.0.0.0:8888
```

Key metrics to monitor:

```
# Bytes exported (after compression)
otelcol_exporter_sent_bytes_total

# Original size before compression
otelcol_exporter_send_bytes_total

# Calculate compression ratio
compression_ratio = original_bytes / sent_bytes
```

### Custom Compression Monitoring

```javascript
// compression-metrics.js
const { metrics } = require('@opentelemetry/api');
const zlib = require('zlib');

const meter = metrics.getMeter('compression-monitor');

const compressionRatio = meter.createObservableGauge(
  'telemetry.compression.ratio',
  { description: 'Ratio of uncompressed to compressed size' }
);

const compressedBytes = meter.createCounter(
  'telemetry.compressed.bytes',
  { description: 'Total compressed bytes sent', unit: 'By' }
);

const uncompressedBytes = meter.createCounter(
  'telemetry.uncompressed.bytes',
  { description: 'Total uncompressed bytes', unit: 'By' }
);

// Track compression stats
let stats = { compressed: 0, uncompressed: 0 };

compressionRatio.addCallback((result) => {
  if (stats.compressed > 0) {
    result.observe(stats.uncompressed / stats.compressed);
  }
});

function trackCompression(originalSize, compressedSize) {
  stats.uncompressed += originalSize;
  stats.compressed += compressedSize;
  uncompressedBytes.add(originalSize);
  compressedBytes.add(compressedSize);
}

module.exports = { trackCompression };
```

## Performance Considerations

### CPU Impact

Compression uses CPU. Benchmark to find the right balance:

```javascript
// benchmark-compression.js
const zlib = require('zlib');

function benchmarkCompression(data, iterations = 1000) {
  // Prepare test data
  const jsonData = JSON.stringify(data);
  const buffer = Buffer.from(jsonData);

  console.log(`Original size: ${buffer.length} bytes`);

  // Benchmark different levels
  for (const level of [1, 6, 9]) {
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      zlib.gzipSync(buffer, { level });
    }

    const elapsed = Date.now() - start;
    const compressed = zlib.gzipSync(buffer, { level });

    console.log(`Level ${level}: ${compressed.length} bytes, ${elapsed}ms for ${iterations} ops`);
    console.log(`  Ratio: ${(buffer.length / compressed.length).toFixed(2)}:1`);
    console.log(`  Throughput: ${((buffer.length * iterations) / (elapsed / 1000) / 1024 / 1024).toFixed(2)} MB/s`);
  }
}

// Test with sample span data
const sampleSpans = Array(100).fill(null).map((_, i) => ({
  traceId: '0123456789abcdef0123456789abcdef',
  spanId: '0123456789abcdef',
  name: `operation-${i}`,
  kind: 1,
  startTimeUnixNano: Date.now() * 1000000,
  endTimeUnixNano: (Date.now() + 100) * 1000000,
  attributes: [
    { key: 'http.method', value: { stringValue: 'GET' } },
    { key: 'http.url', value: { stringValue: 'https://api.example.com/users' } },
    { key: 'http.status_code', value: { intValue: 200 } }
  ]
}));

benchmarkCompression(sampleSpans);
```

Sample output:
```
Original size: 15234 bytes
Level 1: 2845 bytes, 45ms for 1000 ops
  Ratio: 5.35:1
  Throughput: 322.65 MB/s
Level 6: 2312 bytes, 89ms for 1000 ops
  Ratio: 6.59:1
  Throughput: 163.11 MB/s
Level 9: 2298 bytes, 245ms for 1000 ops
  Ratio: 6.63:1
  Throughput: 59.26 MB/s
```

### Memory Impact

Compression buffers require memory. For high-throughput scenarios:

```yaml
# collector-config.yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024
    spike_limit_mib: 256

  batch:
    # Smaller batches use less memory during compression
    send_batch_size: 1000
    send_batch_max_size: 1500
```

## Troubleshooting

### Compression Not Working

Check headers in your requests:

```bash
# Verify Content-Encoding header
curl -v -X POST \
  -H "Content-Type: application/x-protobuf" \
  -H "Content-Encoding: gzip" \
  --data-binary @compressed-data.gz \
  https://collector.example.com:4318/v1/traces
```

### Server Does Not Support Compression

Some backends may not support compressed requests. Check for 415 Unsupported Media Type errors:

```yaml
# Disable compression for incompatible backends
exporters:
  otlphttp/legacy:
    endpoint: "https://legacy-backend.example.com"
    compression: none  # Explicitly disable
```

### High CPU Usage

If compression is causing high CPU:

1. Reduce compression level
2. Use a faster algorithm (snappy instead of gzip)
3. Scale horizontally with more Collector instances

## Summary

Compression reduces telemetry bandwidth by 80-90% with minimal CPU overhead. Enable gzip compression on OTLP exporters using the `compression` option or `OTEL_EXPORTER_OTLP_COMPRESSION` environment variable. Configure the Collector to compress exports to your backend. Use batching alongside compression for maximum efficiency.

For most deployments, gzip with default settings provides the best balance of compression ratio and CPU usage. Monitor your compression ratios and CPU usage to fine-tune settings for your specific workload.

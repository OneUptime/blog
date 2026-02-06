# How to Use OTel Arrow with Zstd Compression for Maximum Telemetry Data Reduction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Zstd, Compression

Description: Combine OTel Arrow with Zstd compression to achieve maximum telemetry data reduction on the wire.

Zstd (Zstandard) is a compression algorithm developed by Facebook that provides an excellent balance between compression ratio and speed. When combined with OTel Arrow's columnar encoding, Zstd delivers the best overall compression for telemetry data, typically reducing wire size by 70-85% compared to standard OTLP with gzip. This post covers how to configure Zstd properly and tune it for your specific workload.

## Why Zstd Works Well with Arrow Data

Arrow's columnar format produces output that is highly compressible. Columns of the same type are stored contiguously: all the `service.name` values together, all the `http.status_code` values together, and so on. When Zstd sees a sequence of similar values packed together, its LZ77-based matching algorithm finds repeated patterns efficiently.

Compared to compressing row-oriented protobuf (where field types alternate constantly), compressing columnar Arrow data gives Zstd much longer match distances and better compression ratios.

```
Compression ratios on typical telemetry data:
  gzip on protobuf OTLP:    3:1 to 5:1
  zstd on protobuf OTLP:    4:1 to 6:1
  gzip on Arrow IPC:         5:1 to 8:1
  zstd on Arrow IPC:         7:1 to 12:1  <-- best combination
```

## Configuring Zstd in the OTel Arrow Exporter

```yaml
exporters:
  otelarrow:
    endpoint: gateway:4317
    tls:
      insecure: true
    # Enable Zstd at the gRPC transport level
    compression: zstd
    arrow:
      num_streams: 4
      max_stream_lifetime: 10m
```

That single line, `compression: zstd`, enables Zstd compression on the gRPC transport. The Arrow encoding is always active when using the `otelarrow` exporter.

## Zstd Compression Levels

Zstd supports compression levels from 1 to 22. Higher levels produce smaller output but use more CPU:

```
Level  | Compression Speed | Ratio  | CPU Usage
-------|-------------------|--------|----------
  1    | ~500 MB/s         | 2.8:1  | Very low
  3    | ~350 MB/s         | 3.2:1  | Low (default)
  5    | ~200 MB/s         | 3.5:1  | Moderate
  9    | ~80 MB/s          | 3.8:1  | High
  15   | ~15 MB/s          | 4.0:1  | Very high
  22   | ~3 MB/s           | 4.1:1  | Extreme
```

Note that the ratio improvement flattens dramatically above level 5. Going from level 3 to level 5 gives about 10% better compression. Going from level 5 to level 22 gives only another 17% while using 60x more CPU.

For telemetry data that is already Arrow-encoded, level 3 is almost always the right choice. The Arrow encoding has already removed structural redundancy, so higher Zstd levels find diminishing returns.

## Zstd Dictionary Training

Zstd supports pre-trained dictionaries that improve compression for small payloads. While this is powerful for some use cases, it is generally not needed with OTel Arrow because Arrow batches are already large enough for Zstd to build effective internal dictionaries on the fly.

However, if your batch sizes are very small (under 100 records), a pre-trained dictionary could help:

```bash
# Train a Zstd dictionary on sample Arrow IPC files
# Capture some sample batches first
zstd --train /tmp/sample-batches/*.arrow -o /etc/otel/zstd-dict

# Reference the dictionary in your Collector config
# (Note: dictionary support depends on your Collector build)
```

For most deployments, skip dictionary training and rely on larger batch sizes instead.

## Receiver-Side Configuration

The receiver handles Zstd decompression automatically when it detects the `grpc-encoding: zstd` header:

```yaml
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        # No explicit decompression config needed
        # gRPC handles it based on the encoding header
```

Make sure the receiver's Collector binary is compiled with Zstd support. The `opentelemetry-collector-contrib` distribution includes it by default.

## Measuring Zstd Performance

Monitor the compression in action:

```bash
# Check the exporter's compression metrics
curl -s http://collector:8888/metrics | grep compression

# Example output:
# otelcol_exporter_otelarrow_compression_ratio 8.5
# This means 8.5:1 compression ratio (Arrow + Zstd combined)
```

You can also compare bytes before and after compression:

```promql
# Uncompressed bytes (Arrow-encoded but not Zstd-compressed)
otelcol_exporter_otelarrow_uncompressed_bytes_total

# Compressed bytes (after Zstd)
otelcol_exporter_otelarrow_compressed_bytes_total

# Zstd-specific compression ratio
otelcol_exporter_otelarrow_uncompressed_bytes_total
  / otelcol_exporter_otelarrow_compressed_bytes_total
```

## Comparing Zstd with Other Options

Run a quick comparison using your actual telemetry:

```yaml
# Config A: OTel Arrow + gzip
exporters:
  otelarrow/gzip:
    endpoint: receiver-a:4317
    compression: gzip
    arrow:
      num_streams: 4

# Config B: OTel Arrow + zstd
exporters:
  otelarrow/zstd:
    endpoint: receiver-b:4317
    compression: zstd
    arrow:
      num_streams: 4

# Config C: OTel Arrow + snappy
exporters:
  otelarrow/snappy:
    endpoint: receiver-c:4317
    compression: snappy
    arrow:
      num_streams: 4
```

Typical results:

```
Arrow + gzip:   6:1 compression, 15% CPU overhead
Arrow + zstd:   8:1 compression, 10% CPU overhead
Arrow + snappy: 4:1 compression, 5% CPU overhead
```

Zstd wins on both compression ratio and CPU efficiency compared to gzip. Snappy uses less CPU but compresses significantly less. For most telemetry pipelines, Zstd is the clear winner.

## Memory Considerations

Zstd uses a sliding window for compression. The default window size is 8 MB. For the Collector, this means each Arrow stream's Zstd compressor uses approximately 8 MB of memory. With 4 streams:

```
Zstd memory per exporter = num_streams * window_size
                         = 4 * 8 MB
                         = 32 MB
```

This is modest but worth accounting for in memory-constrained environments like sidecar containers. If memory is tight, reduce `num_streams` or use a lower Zstd level (which uses smaller windows).

The combination of OTel Arrow's columnar encoding and Zstd's compression algorithm is the most bandwidth-efficient way to transport OpenTelemetry data. For cross-region or high-volume deployments, it can meaningfully reduce your cloud networking costs.

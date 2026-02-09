# How to Configure Dual-Level Compression (gRPC + Arrow) in the OTel Arrow Exporter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Compression, gRPC

Description: Configure dual-level compression in OTel Arrow combining gRPC transport compression with Arrow columnar encoding.

OTel Arrow provides two distinct layers of compression that work together. The first layer is the Arrow columnar encoding with dictionary compression, which restructures telemetry data for optimal compressibility. The second layer is the gRPC transport-level compression (typically Zstd or gzip), which compresses the already-optimized Arrow byte stream before sending it over the wire. Understanding and tuning both layers is key to getting the maximum bandwidth reduction from your telemetry pipeline.

## How the Two Layers Interact

Here is what happens when a batch of telemetry is exported:

1. **Arrow encoding**: The raw OTLP data is converted into Apache Arrow record batches. String values are dictionary-encoded. Numeric values are stored in typed arrays. This alone reduces the data size because repeated values are stored once.

2. **Serialization**: The Arrow record batches are serialized into the Arrow IPC format (a binary format designed for zero-copy reads).

3. **Transport compression**: The serialized bytes are compressed using a standard compression algorithm (Zstd, gzip, or snappy) at the gRPC level before being sent over the network.

Each layer targets a different type of redundancy:

```
Raw OTLP data:           100%
After Arrow encoding:     40-60% (dictionary + columnar layout)
After Zstd compression:   15-30% (general-purpose compression)
Total reduction:           70-85%
```

## Configuring Arrow-Level Compression

The Arrow encoder's compression is built in and always active. You do not need to configure it explicitly. The dictionary encoding and columnar layout are fundamental to how Arrow works.

However, you can influence its effectiveness by tuning batch sizes. Larger batches give the dictionary encoder more data to work with:

```yaml
processors:
  batch:
    # Larger batches improve Arrow dictionary efficiency
    timeout: 5s
    send_batch_size: 2000
    send_batch_max_size: 5000
```

With 2,000 spans per batch, the dictionary can efficiently encode common attribute values. With only 50 spans per batch, there is not enough data for the dictionary to provide meaningful savings.

## Configuring gRPC-Level Compression

The gRPC transport compression is configured on the exporter. OTel Arrow supports several compression algorithms:

```yaml
exporters:
  otelarrow:
    endpoint: gateway:4317
    # Transport-level compression
    compression: zstd
    arrow:
      num_streams: 4
      max_stream_lifetime: 10m
```

Available options:

- **`zstd`** (recommended): Best compression ratio for telemetry data. Uses dictionary-based compression that works very well on the already-structured Arrow output. Typical ratios of 3:1 to 5:1 on top of Arrow encoding.

- **`gzip`**: Widely supported but slower than Zstd. Compression ratios are slightly lower. Use this if your infrastructure does not support Zstd.

- **`snappy`**: Fastest compression but lowest ratio. Good for CPU-constrained environments where you want some compression without significant CPU overhead.

- **`none`**: Disable transport compression. Only use this if you are on a very fast local network and want to minimize CPU usage at the cost of bandwidth.

```yaml
# Comparison of compression options:
#
# Algorithm  | CPU Usage | Compression Ratio | Best For
# -----------|-----------|-------------------|---------
# zstd       | Medium    | 3:1 - 5:1        | Most deployments
# gzip       | High      | 2.5:1 - 4:1      | Compatibility
# snappy     | Low       | 1.5:1 - 2.5:1    | CPU constrained
# none       | None      | 1:1              | Local network
```

## Receiver-Side Compression Configuration

The receiver must also be configured to handle the compression algorithm used by the exporter:

```yaml
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        # The receiver automatically handles decompression
        # No explicit compression config needed on the receiver
        # It negotiates based on the client's request headers
```

gRPC handles compression negotiation automatically. The exporter sends the `grpc-encoding` header indicating the compression algorithm, and the receiver decompresses accordingly. You do not need to explicitly configure the receiver to match the exporter.

## Measuring the Effect of Each Layer

To understand how much each compression layer contributes, you can test with different configurations:

```bash
# Test 1: Standard OTLP with gzip (baseline)
# Exporter config: otlp with compression: gzip

# Test 2: OTel Arrow without transport compression
# Exporter config: otelarrow with compression: none

# Test 3: OTel Arrow with Zstd (full dual compression)
# Exporter config: otelarrow with compression: zstd
```

Measure the bytes sent for each configuration over the same workload:

```promql
# Bytes exported per second
rate(otelcol_exporter_sent_bytes_total[5m])
```

Typical results from a microservices workload with repetitive attributes:

```
Standard OTLP + gzip:     100% (baseline)
OTel Arrow + no compression: 45-55%
OTel Arrow + zstd:          20-30%
```

The Arrow encoding alone provides 45-55% reduction. Adding Zstd on top brings it down to 20-30% of the original size.

## Zstd Compression Level Tuning

Zstd supports compression levels from 1 (fastest, least compression) to 22 (slowest, most compression). The default level in the gRPC Zstd implementation is typically 3, which is a good balance:

```yaml
exporters:
  otelarrow:
    endpoint: gateway:4317
    compression: zstd
    # Some implementations allow setting the compression level
    # Check your Collector version for support
```

For telemetry data, levels 1-5 give the best trade-off between CPU and compression ratio. Going above level 5 adds significant CPU cost for marginal compression gains, because the Arrow encoding has already removed most of the redundancy.

## CPU Impact of Dual Compression

Arrow encoding is lightweight because it mostly involves dictionary lookups and memory copies. The transport compression (Zstd) is the heavier operation. On a typical Collector instance:

- Arrow encoding: adds roughly 2-5% CPU overhead
- Zstd compression at level 3: adds roughly 5-10% CPU overhead
- Combined: 7-15% additional CPU usage on the exporter

This CPU cost is offset by reduced network I/O, which frees up network bandwidth and reduces cloud egress costs. In most cases, the trade-off is well worth it, especially for cross-region or cross-cloud telemetry transport.

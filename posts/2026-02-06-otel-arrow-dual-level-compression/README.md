# How to Configure Dual-Level Compression in the OTel Arrow Exporter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Compression, gRPC

Description: Configure dual-level compression in OTel Arrow combining gRPC transport compression with Arrow columnar encoding.

OTel Arrow provides two distinct compression points that work together. The first is the Arrow layer: OTLP data is converted into Arrow record batches, using columnar layout and dictionaries where appropriate, and the Arrow IPC payload can be compressed with Zstd. The second is the gRPC transport-level compression (typically Zstd, gzip, or snappy), which compresses the already-optimized Arrow byte stream before sending it over the wire. Understanding and tuning both layers is key to getting the maximum bandwidth reduction from your telemetry pipeline.

## How the Two Layers Interact

Here is what happens when a batch of telemetry is exported:

1. **Arrow encoding**: The raw OTLP data is converted into Apache Arrow record batches. Repeated values can be represented with Arrow dictionaries, and numeric values are stored in typed arrays. This reduces the data size because repeated values can be referenced by compact indices.

2. **Serialization and Arrow payload compression**: The Arrow record batches are serialized into the Arrow IPC format (a binary format designed for zero-copy reads). The OTel Arrow exporter supports `arrow.payload_compression`, which is `zstd` by default in current Collector Contrib releases.

3. **Transport compression**: The serialized bytes are compressed using a standard compression algorithm (`zstd`, `gzip`, or `snappy`) at the gRPC level before being sent over the network.

Each layer targets a different type of redundancy:

```text
Raw OTLP data:           100%
After Arrow encoding:     40-60% (dictionary + columnar layout)
After Zstd compression:   15-30% (Arrow IPC + gRPC compression)
Total reduction:           70-85%
```

## Configuring Arrow-Level Compression

The Arrow encoder's columnar layout is built in, and Arrow IPC payload compression is enabled by default in current OTel Arrow exporter releases:

```yaml
exporters:
  otelarrow:
    endpoint: gateway:4317
    arrow:
      # Arrow IPC payload compression; default is zstd
      payload_compression: zstd
```

Compression settings at the Arrow IPC level cannot be tuned further. To disable Arrow IPC payload compression, set `payload_compression: none`.

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
      zstd:
        # gRPC Zstd compression level; default is 5
        level: 5
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

The receiver must be able to handle the compression algorithm used by the exporter:

```yaml
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        # The receiver automatically handles gRPC decompression
        # No matching compression setting is needed here
```

gRPC handles compression negotiation automatically. The exporter sends the `grpc-encoding` header indicating the compression algorithm, and the receiver decompresses accordingly. You do not need to explicitly configure the receiver to match the exporter's gRPC compression setting. The OTel Arrow receiver also has optional `arrow.zstd` decoder settings for memory and concurrency limits when Zstd is used.

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
# Compressed bytes exported per second on the wire
rate(otelcol_exporter_sent_wire_total[5m])

# Uncompressed bytes before compression
rate(otelcol_exporter_sent_total[5m])
```

Typical results from a microservices workload with repetitive attributes:

```text
Standard OTLP + gzip:     100% (baseline)
OTel Arrow + no compression: 45-55%
OTel Arrow + zstd:          20-30%
```

The Arrow encoding alone provides 45-55% reduction. Adding Zstd on top brings it down to 20-30% of the original size.

## Zstd Compression Level Tuning

The OTel Arrow exporter exposes 10 gRPC Zstd levels through its `arrow.zstd.level` setting. The default level is 5, which is a good balance:

```yaml
exporters:
  otelarrow:
    endpoint: gateway:4317
    compression: zstd
    arrow:
      zstd:
        level: 5
```

For telemetry data, levels 1-5 usually give the best trade-off between CPU and compression ratio. Going above level 5 can add significant CPU cost for marginal compression gains, because the Arrow encoding has already removed much of the redundancy.

## CPU Impact of Dual Compression

Arrow encoding is lightweight because it mostly involves dictionary lookups and memory copies. The transport compression (Zstd) is the heavier operation. On a typical Collector instance:

- Arrow encoding: adds roughly 2-5% CPU overhead
- Zstd compression at the default level: adds roughly 5-10% CPU overhead
- Combined: 7-15% additional CPU usage on the exporter

This CPU cost is offset by reduced network I/O, which frees up network bandwidth and reduces cloud egress costs. In most cases, the trade-off is well worth it, especially for cross-region or cross-cloud telemetry transport.

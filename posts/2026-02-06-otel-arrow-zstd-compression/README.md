# How to Use OTel Arrow with Zstd Compression for Maximum Telemetry Data Reduction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, ZSTD, Compression

Description: Combine OTel Arrow with Zstd compression to achieve maximum telemetry data reduction on the wire.

Zstd (Zstandard) is a compression algorithm developed by Facebook that provides an excellent balance between compression ratio and speed. When combined with OTel Arrow's columnar encoding, Zstd delivers strong compression for telemetry data. The OTel Arrow maintainers report that an OTel Arrow exporter/receiver pair typically uses about 50% less bandwidth than standard OTLP/gRPC with Zstd compression, batch sizes being equal. This post covers how to configure Zstd properly and tune it for your specific workload.

## Why Zstd Works Well with Arrow Data

Arrow's columnar format produces output that is highly compressible. Columns of the same type are stored contiguously: all the `service.name` values together, all the `http.status_code` values together, and so on. When Zstd sees a sequence of similar values packed together, its LZ77-based matching algorithm finds repeated patterns efficiently.

Compared to compressing row-oriented protobuf (where field types alternate constantly), compressing columnar Arrow data gives Zstd much longer match distances and better compression ratios.

```text
Compression factors observed in OTel Arrow production traces:
  OTLP/gRPC with Zstd:       ~12:1
  OTel Arrow with Zstd:      ~16:1 to 18:1

Results vary by signal type, batch size, attribute cardinality, and payload entropy.
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
      payload_compression: zstd
```

That single line, `compression: zstd`, enables Zstd compression on the gRPC transport. Current OTel Arrow exporter defaults already use Zstd for gRPC-level compression, so the setting is explicit rather than required. The `payload_compression: zstd` setting applies Zstd at the Arrow IPC payload level, and is also the current default. Arrow encoding is active when using the `otelarrow` exporter unless you set `arrow.disabled: true`; by default the exporter may fall back to standard OTLP if the receiver does not support Arrow.

## Zstd Compression Levels

The Zstd command-line tool supports regular compression levels from 1 to 19, with ultra levels 20 through 22 available via `--ultra`. The OTel Arrow exporter exposes 10 configurable gRPC Zstd levels under `arrow.zstd.level`; higher levels produce smaller output but use more CPU:

```text
Level  | Collector meaning
-------|------------------
  1    | Fastest OTel Arrow gRPC Zstd level
  5    | Default OTel Arrow gRPC Zstd level
  10   | Highest OTel Arrow gRPC Zstd level
```

Configure the level under the `arrow.zstd` block:

```yaml
exporters:
  otelarrow:
    endpoint: gateway:4317
    tls:
      insecure: true
    compression: zstd
    arrow:
      zstd:
        level: 5
```

Note that the ratio improvement usually flattens as compression levels rise, while CPU and memory costs increase.

For telemetry data that is already Arrow-encoded, the default level 5 is a good starting point. The Arrow encoding has already removed structural redundancy, so higher Zstd levels often find diminishing returns.

## Zstd Dictionary Training

Zstd supports pre-trained dictionaries that improve compression for small payloads. While this is powerful for some use cases, it is generally not needed with OTel Arrow because Arrow batches are already large enough for Zstd to build effective internal dictionaries on the fly.

However, if your batch sizes are very small (under 100 records), a pre-trained dictionary could help:

```bash
# Train a Zstd dictionary on sample Arrow IPC files

# Capture some sample batches first
zstd --train /tmp/sample-batches/*.arrow -o /etc/otel/zstd-dict
```

The OTel Arrow exporter and receiver configuration does not expose a setting for pre-trained Zstd dictionaries. For most deployments, skip dictionary training and rely on larger batch sizes instead.

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

Make sure the receiver's Collector binary includes the `otelarrow` receiver. The `opentelemetry-collector-contrib` and OpenTelemetry Collector Kubernetes distributions include it.

## Measuring Zstd Performance

Monitor the compression in action:

```bash
# Check the exporter's compression metrics
curl -s http://collector:8888/metrics | grep otelcol_exporter_sent

# Example output:
# otelcol_exporter_sent 1.7e+10
# otelcol_exporter_sent_wire 1.0e+09
# Dividing sent by sent_wire gives a 17:1 compression ratio.
```

You can also compare bytes before and after compression:

```promql
# Uncompressed bytes (Arrow-encoded but not Zstd-compressed)
otelcol_exporter_sent

# Compressed bytes (after Zstd)
otelcol_exporter_sent_wire

# On-the-wire compression ratio
otelcol_exporter_sent
  / otelcol_exporter_sent_wire
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
      payload_compression: none

# Config B: OTel Arrow + zstd
exporters:
  otelarrow/zstd:
    endpoint: receiver-b:4317
    compression: zstd
    arrow:
      num_streams: 4
      payload_compression: zstd

# Config C: OTel Arrow + snappy
exporters:
  otelarrow/snappy:
    endpoint: receiver-c:4317
    compression: snappy
    arrow:
      num_streams: 4
      payload_compression: none
```

Typical results will vary by data and batch size. In OpenTelemetry's gRPC compression benchmarks, Zstd had the best compression ratio for the tested payloads, while Snappy compressed much faster with lower compression ratios:

```text
Arrow + gzip:   good compression, moderate CPU cost
Arrow + zstd:   strongest compression in the Collector benchmark set
Arrow + snappy: fastest compression, lower compression ratio
```

Zstd wins on compression ratio in the Collector benchmark set. Snappy uses less CPU but compresses significantly less. For bandwidth-sensitive telemetry pipelines, Zstd is usually the best starting point.

## Memory Considerations

Zstd uses a sliding window for compression. In the OTel Arrow exporter, `arrow.zstd.window_size_mib` controls the gRPC Zstd window size; `0` means the library chooses a size based on the configured level. The receiver also has a decompression memory limit, `arrow.zstd.memory_limit_mib`, which defaults to 128 MiB per stream. With 4 streams, plan for per-stream compression and decompression memory rather than treating Zstd as a single global buffer:

```text
Zstd memory scales roughly with configured streams:
  exporter side: num_streams * compressor working memory
  receiver side: num_streams * arrow.zstd.memory_limit_mib
```

This is worth accounting for in memory-constrained environments like sidecar containers. If memory is tight, reduce `num_streams`, lower the Zstd level, or configure the receiver's Zstd memory limit.

The combination of OTel Arrow's columnar encoding and Zstd's compression algorithm is the most bandwidth-efficient way to transport OpenTelemetry data. For cross-region or high-volume deployments, it can meaningfully reduce your cloud networking costs.

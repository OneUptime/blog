# How to Use the OTAP Phase 2 Rust Libraries for End-to-End Arrow Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTAP, Rust, Apache Arrow

Description: Use the OTAP Phase 2 Rust libraries to build end-to-end Arrow-native telemetry pipelines with lower-copy processing.

The OTel Arrow Protocol (OTAP) Phase 2 introduces Rust libraries for working with Arrow-encoded telemetry data natively. Instead of converting between protobuf objects and Arrow at every hop, these libraries let you build pipelines where data can stay in OTAP records from ingestion through processing. This reduces serialization overhead and enables lower-copy processing, which is a significant performance improvement for high-throughput telemetry systems.

## What OTAP Phase 2 Adds

Phase 1 of OTel Arrow focused on the transport layer: encoding OTLP data into Arrow for efficient wire transfer, then decoding it back to OTLP at the receiver. This works but involves two format conversions per hop.

Phase 2 provides native Arrow data structures and processing libraries in Rust through the OTAP Dataflow Engine:

- `otap-df-otap`: OTAP/OTLP pipeline data types, transport support, and conversions
- `otap-df-pdata`: OTAP record batch handling, Arrow payload types, and protobuf support
- `otap-df-core-nodes`: Core receivers, processors, and exporters for dataflow pipelines

## Getting Started with the Rust Libraries

The Phase 2 crates are currently developed in the OpenTelemetry `otel-arrow` repository and are not published to crates.io as standalone `otel-arrow-*` packages. Clone the repository and build the `df_engine` binary from the Rust workspace:

```bash
git clone https://github.com/open-telemetry/otel-arrow.git
cd otel-arrow/rust/otap-dataflow
cargo build --bin df_engine --no-default-features
```

The current workspace uses Apache Arrow 58.1, Tonic 0.14, Prost 0.14, Tokio 1.48, and Rust 1.87.

## Converting OTLP to Arrow

The Phase 2 design does not expose a published `otel-arrow-adapter` crate with a `convert_traces` helper. In current OTAP pipelines, conversion normally happens at the protocol boundary: OTLP bytes and OTAP records are alternate signal-specific representations inside `otap_df_otap::pdata::OtapPdata`, and the Phase 1 Collector components can convert OTLP traffic to OTAP over Arrow IPC streams.

OTAP records are not represented as one flat trace batch. The data model uses multiple Arrow `RecordBatch` values per signal in a star schema. For traces, that includes payload types such as `SPANS`, `SPAN_ATTRS`, `SPAN_EVENTS`, `SPAN_LINKS`, `SPAN_EVENT_ATTRS`, and `SPAN_LINK_ATTRS`.

## Processing Arrow Data Without Conversion

The key advantage of Phase 2 is processing data in Arrow format without converting back to protobuf:

```yaml
version: otel_dataflow/v1
engine: {}
groups:
  default:
    pipelines:
      main:
        nodes:
          receiver:
            type: receiver:traffic_generator
            config:
              data_source: synthetic
              traffic_config:
                max_signal_count: 1000
                max_batch_size: 100
                signals_per_second: 100
                metric_weight: 100
                trace_weight: 0
                log_weight: 0
          filter:
            type: processor:filter
            config:
              metrics:
                include:
                  match_type: strict
                  metric_names:
                    - http.server.request.count
                    - process.cpu.utilization
          noop:
            type: exporter:noop
            config:
        connections:
          - from: receiver
            to: filter
          - from: filter
            to: noop
```

This keeps filtering inside the OTAP Dataflow pipeline rather than decoding protobuf objects, filtering, and re-encoding. The current filter processor is still marked WIP in the repository, so check its README for supported signal fields before relying on it in production.

## Building an Arrow-Native gRPC Server

OTAP uses signal-specific bidirectional gRPC streams carrying Arrow IPC record batches. The protocol defines services like this:

```proto
service ArrowTracesService {
  rpc ArrowTraces(stream BatchArrowRecords) returns (stream BatchStatus) {}
}

message BatchArrowRecords {
  int64 batch_id = 1;
  repeated ArrowPayload arrow_payloads = 2;
  bytes headers = 3;
}

message ArrowPayload {
  string schema_id = 1;
  ArrowPayloadType type = 2;
  bytes record = 3;
}
```

The Phase 2 Rust implementation provides OTAP receiver and exporter nodes in `otap-df-core-nodes`, with shared transport support in `otap-df-otap`. For most pipelines, configure those nodes instead of hand-writing a Tonic service.

## Arrow-Native Aggregation

Phase 2 libraries also include aggregation-oriented processors. The temporal reaggregation processor reaggregates supported metrics over a lower-frequency period:

```yaml
temporal-reaggregation:
  type: urn:otel:processor:temporal_reaggregation
  config:
    period: 60s
    inbound_request_limit: 1024
    outbound_request_limit: 2048
    max_stream_cardinality: 16384
```

It currently supports cumulative monotonic sums, cumulative histograms, cumulative exponential histograms, gauges, and summaries. Other metric types pass through unchanged.

## End-to-End Arrow Pipeline

Putting it all together, an end-to-end Arrow pipeline looks like this:

```text
[SDK] --OTLP--> [Arrow Converter] --Arrow IPC--> [Arrow Processor] --Arrow IPC--> [Arrow-Native Backend]
                  (Collector OTAP)                (Phase 2 lib)                   (Parquet, etc.)
```

The data is converted to OTAP records at the ingestion boundary and can stay in Arrow format through processing, routing, and storage. Each step operates on columnar data using Arrow record batches rather than row-by-row protobuf object processing.

## Performance Characteristics

The Phase 2 project goals describe:

- **Processing speed**: 2-10x gains compared with OTLP/Golang depending on pipeline configuration and complexity
- **Memory efficiency**: lower memory cost through columnar records, explicit memory controls, and fewer intermediate protocol objects
- **Transport compatibility**: OTAP remains convertible with OTLP and uses Arrow IPC over gRPC streams

The OTAP Phase 2 Rust libraries are still maturing, but they point toward a future where telemetry pipelines process data as efficiently as analytical databases. If you are building custom telemetry infrastructure, these libraries are worth evaluating.

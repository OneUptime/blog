# How to Use the OTAP (OTel Arrow Protocol) Phase 2 Rust Libraries for End-to-End Arrow Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTAP, Rust, Apache Arrow

Description: Use the OTAP Phase 2 Rust libraries to build end-to-end Arrow-native telemetry pipelines with zero-copy performance.

The OTel Arrow Protocol (OTAP) Phase 2 introduces Rust libraries for working with Arrow-encoded telemetry data natively. Instead of converting between protobuf and Arrow at every hop, these libraries let you build pipelines where data stays in Arrow format from ingestion to storage. This eliminates serialization overhead and enables zero-copy processing, which is a significant performance improvement for high-throughput telemetry systems.

## What OTAP Phase 2 Adds

Phase 1 of OTel Arrow focused on the transport layer: encoding OTLP data into Arrow for efficient wire transfer, then decoding it back to OTLP at the receiver. This works but involves two format conversions per hop.

Phase 2 provides native Arrow data structures and processing libraries in Rust:

- `otel-arrow-rust`: Core library for Arrow-native telemetry data structures
- `otel-arrow-adapter`: Converters between OTLP protobuf and Arrow
- `otel-arrow-processor`: Arrow-native processing (filtering, transforming, routing)

## Getting Started with the Rust Libraries

Add the dependencies to your `Cargo.toml`:

```toml
[dependencies]
otel-arrow-rust = "0.2"
otel-arrow-adapter = "0.2"
arrow = "52"
tonic = "0.11"
prost = "0.12"
tokio = { version = "1", features = ["full"] }
```

## Converting OTLP to Arrow

The adapter library converts standard OTLP protobuf messages into Arrow record batches:

```rust
use otel_arrow_adapter::otlp_to_arrow;
use otel_arrow_rust::traces::TraceBatch;
use arrow::record_batch::RecordBatch;

// Receive OTLP trace data (from gRPC handler)
fn convert_traces(otlp_request: ExportTraceServiceRequest) -> Result<TraceBatch, Error> {
    // Convert the protobuf message into an Arrow-native TraceBatch
    // This creates a columnar representation of all spans
    let trace_batch = otlp_to_arrow::convert_traces(&otlp_request)?;

    // trace_batch now contains Arrow RecordBatches with columns like:
    // - trace_id: FixedSizeBinary(16)
    // - span_id: FixedSizeBinary(8)
    // - name: Dictionary<Utf8>
    // - start_time_unix_nano: UInt64
    // - end_time_unix_nano: UInt64
    // - attributes: Map<Utf8, Utf8>

    Ok(trace_batch)
}
```

## Processing Arrow Data Without Conversion

The key advantage of Phase 2 is processing data in Arrow format without converting back to protobuf:

```rust
use otel_arrow_processor::{Filter, Transform};
use arrow::compute;

// Filter spans by service name without deserializing to protobuf
fn filter_by_service(
    batch: &RecordBatch,
    service_name: &str,
) -> Result<RecordBatch, Error> {
    // Get the service_name column
    let service_col = batch
        .column_by_name("resource.service.name")
        .ok_or(Error::ColumnNotFound)?;

    // Use Arrow's compute kernel for filtering
    // This operates directly on the columnar data, no deserialization needed
    let predicate = compute::eq_utf8_scalar(
        service_col.as_any().downcast_ref::<StringArray>().unwrap(),
        service_name,
    )?;

    // Apply the filter to the entire batch
    let filtered = compute::filter_record_batch(batch, &predicate)?;
    Ok(filtered)
}
```

This is significantly faster than the traditional approach of decoding protobuf into Go structs, filtering, and re-encoding.

## Building an Arrow-Native gRPC Server

Here is a minimal gRPC server that receives OTel Arrow data and processes it natively:

```rust
use tonic::{transport::Server, Request, Response, Status};
use otel_arrow_rust::receiver::ArrowReceiver;

pub struct ArrowTraceService {
    // Store for Arrow record batches
    storage: Arc<dyn ArrowStorage>,
}

#[tonic::async_trait]
impl ArrowTracesService for ArrowTraceService {
    async fn arrow_traces(
        &self,
        request: Request<tonic::Streaming<ArrowPayload>>,
    ) -> Result<Response<ArrowTracesServiceResponse>, Status> {
        let mut stream = request.into_inner();

        while let Some(payload) = stream.message().await? {
            // Decode the Arrow IPC payload directly into RecordBatches
            // No protobuf conversion needed
            let batches = ArrowReceiver::decode_payload(&payload)?;

            for batch in batches {
                // Process each batch in Arrow-native format
                let filtered = filter_by_service(&batch, "checkout-service")
                    .map_err(|e| Status::internal(e.to_string()))?;

                // Store the Arrow batch directly
                // If your backend is Arrow-native (e.g., ClickHouse),
                // this is zero-copy all the way through
                self.storage.insert(filtered).await
                    .map_err(|e| Status::internal(e.to_string()))?;
            }
        }

        Ok(Response::new(ArrowTracesServiceResponse {}))
    }
}
```

## Arrow-Native Aggregation

Phase 2 libraries also support aggregation operations on telemetry data without format conversion:

```rust
use arrow::compute::aggregate;
use otel_arrow_processor::metrics::aggregate_metrics;

// Compute average span duration grouped by service name
fn compute_avg_duration(batch: &RecordBatch) -> Result<RecordBatch, Error> {
    let start_col = batch.column_by_name("start_time_unix_nano")
        .unwrap()
        .as_any()
        .downcast_ref::<UInt64Array>()
        .unwrap();

    let end_col = batch.column_by_name("end_time_unix_nano")
        .unwrap()
        .as_any()
        .downcast_ref::<UInt64Array>()
        .unwrap();

    // Compute duration using Arrow's vectorized arithmetic
    // This processes thousands of spans in a single pass
    let durations: UInt64Array = start_col
        .iter()
        .zip(end_col.iter())
        .map(|(s, e)| match (s, e) {
            (Some(start), Some(end)) => Some(end - start),
            _ => None,
        })
        .collect();

    // Average duration across all spans in the batch
    let avg = aggregate::sum(&durations).unwrap_or(0) / durations.len() as u64;

    println!("Average span duration: {} ns ({} ms)", avg, avg / 1_000_000);

    Ok(batch.clone())
}
```

## End-to-End Arrow Pipeline

Putting it all together, an end-to-end Arrow pipeline looks like this:

```
[SDK] --OTLP--> [Arrow Converter] --Arrow IPC--> [Arrow Processor] --Arrow IPC--> [Arrow-Native Backend]
                  (Phase 2 lib)                   (Phase 2 lib)                   (ClickHouse, etc.)
```

The data is converted to Arrow once at the ingestion boundary and stays in Arrow format through processing, routing, and storage. Each step operates on columnar data using vectorized operations, which is dramatically faster than row-by-row protobuf processing.

## Performance Characteristics

In benchmarks, Arrow-native processing shows:

- **Filtering**: 5-10x faster than protobuf decode + filter + re-encode
- **Aggregation**: 8-15x faster due to vectorized computation on columnar data
- **Memory efficiency**: 30-50% less memory because Arrow uses memory-mapped buffers and avoids Go/Java object overhead

The OTAP Phase 2 Rust libraries are still maturing, but they point toward a future where telemetry pipelines process data as efficiently as analytical databases. If you are building custom telemetry infrastructure, these libraries are worth evaluating.

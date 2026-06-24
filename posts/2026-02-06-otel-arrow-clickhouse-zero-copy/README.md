# How to Integrate OTel Arrow with Apache Arrow-Native Backends Like ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, ClickHouse, Zero-Copy

Description: Integrate OTel Arrow with ClickHouse and other Arrow-native backends to achieve zero-copy telemetry ingestion.

The biggest performance win from OTel Arrow is not just the transport compression. It is the possibility of keeping data in Arrow format for more of the path from the Collector to the storage backend, reducing serialization and deserialization steps. ClickHouse, with its native Arrow format support, is one of the best backends for this lower-copy ingestion pattern. This post shows how to wire it up.

## The Serialization Tax

In a traditional OTLP pipeline, data undergoes multiple format conversions:

```text
[SDK] -> protobuf -> [Collector] -> Go structs -> [ClickHouse Exporter] -> driver insert/JSON -> [ClickHouse]
```

Each conversion takes CPU time and allocates memory. For a Collector handling 100,000 spans per second, these conversions can be a major part of total CPU.

With OTel Arrow and a native backend:

```text
[SDK] -> protobuf -> [Arrow Converter] -> Arrow -> [ClickHouse] (native Arrow insert)
```

The data is converted to Arrow once and can stay in that format until ingestion. ClickHouse parses the Arrow batches and casts their fields into ClickHouse columns for storage.

## ClickHouse Arrow Insert Format

ClickHouse supports inserting data in Apache Arrow format natively via its HTTP interface. `FORMAT Arrow` is Arrow IPC file mode:

```bash
# Insert Arrow IPC data directly into ClickHouse

curl -X POST "http://clickhouse:8123/?query=INSERT+INTO+otel_traces+FORMAT+Arrow" \
  --data-binary @traces.arrow \
  -H "Content-Type: application/octet-stream"
```

The `FORMAT Arrow` directive tells ClickHouse to parse the request body as Arrow IPC file format. This avoids JSON decoding, CSV splitting, and row-by-row SQL values parsing for the inserted data.

For Arrow IPC stream mode, use `FORMAT ArrowStream` instead:

```bash
curl -X POST "http://clickhouse:8123/?query=INSERT+INTO+otel_traces+FORMAT+ArrowStream" \
  --data-binary @traces.arrowstream \
  -H "Content-Type: application/octet-stream"
```

The `FORMAT` directive tells ClickHouse how to parse the request body. ClickHouse still parses the `INSERT` query itself, but the inserted data avoids JSON decoding, CSV splitting, or row-by-row SQL values parsing.

## Setting Up the ClickHouse Schema

Create a table that matches the flattened span records you send to ClickHouse after converting OTel Arrow's OTAP record batches into rows:

```sql
-- ClickHouse table for OpenTelemetry traces
CREATE TABLE otel_traces
(
    -- Trace identity
    trace_id          FixedString(16),
    span_id           FixedString(8),
    parent_span_id    FixedString(8),

    -- Span metadata
    name              LowCardinality(String),
    kind              Enum8('UNSPECIFIED'=0, 'INTERNAL'=1, 'SERVER'=2, 'CLIENT'=3, 'PRODUCER'=4, 'CONSUMER'=5),
    start_time        DateTime64(9, 'UTC'),
    end_time          DateTime64(9, 'UTC'),
    duration_ns       UInt64 MATERIALIZED toUnixTimestamp64Nano(end_time) - toUnixTimestamp64Nano(start_time),

    -- Status
    status_code       Enum8('UNSET'=0, 'OK'=1, 'ERROR'=2),
    status_message    String,

    -- Resource attributes
    service_name      LowCardinality(String),
    service_version   LowCardinality(String),
    deployment_env    LowCardinality(String),

    -- Span attributes (stored as a map for flexibility)
    attributes        Map(LowCardinality(String), String),

    -- Resource attributes map
    resource_attributes Map(LowCardinality(String), String)
)
ENGINE = MergeTree()
PARTITION BY toDate(start_time)
ORDER BY (service_name, name, start_time)
TTL toDate(start_time) + INTERVAL 30 DAY;
```

This example assumes `trace_id`, `span_id`, and `parent_span_id` are raw binary IDs. If your converter emits hexadecimal strings, use `String` or the corresponding hex length, such as `FixedString(32)` for trace IDs and `FixedString(16)` for span IDs.

The `LowCardinality` type in ClickHouse is analogous to Arrow's dictionary encoding. Both optimize storage of repeated string values. OTel Arrow's OTAP representation uses multiple record batches for a signal, so a production exporter must flatten or otherwise map those batches into the table shape you choose.

## Building a Custom Arrow-to-ClickHouse Exporter

The standard ClickHouse exporter in the Collector does not expose an Arrow insert path. For lower-copy Arrow ingestion, you need a custom exporter (or a modified version) that accepts Arrow records and writes them to ClickHouse using `FORMAT ArrowStream` or `FORMAT Arrow`:

```go
package clickhousearrowexporter

import (
    "bytes"
    "context"
    "fmt"
    "net/http"
    "net/url"

    "github.com/apache/arrow/go/v18/arrow"
    "github.com/apache/arrow/go/v18/arrow/ipc"
)

type ClickHouseArrowExporter struct {
    endpoint string
    table    string
    client   *http.Client
}

// ConsumeArrowBatch sends an Arrow record batch directly to ClickHouse
func (e *ClickHouseArrowExporter) ConsumeArrowBatch(
    ctx context.Context,
    batch arrow.Record,
) error {
    // Serialize the Arrow record batch to IPC stream format
    var buf bytes.Buffer
    writer := ipc.NewWriter(&buf, ipc.WithSchema(batch.Schema()))

    if err := writer.Write(batch); err != nil {
        return fmt.Errorf("failed to write Arrow batch: %w", err)
    }
    if err := writer.Close(); err != nil {
        return fmt.Errorf("failed to close Arrow writer: %w", err)
    }

    // Send directly to ClickHouse using ArrowStream format
    query := fmt.Sprintf("INSERT INTO %s FORMAT ArrowStream", e.table)
    insertURL := fmt.Sprintf("%s/?query=%s", e.endpoint, url.QueryEscape(query))

    req, err := http.NewRequestWithContext(ctx, "POST", insertURL, &buf)
    if err != nil {
        return err
    }
    req.Header.Set("Content-Type", "application/octet-stream")

    resp, err := e.client.Do(req)
    if err != nil {
        return fmt.Errorf("ClickHouse insert failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("ClickHouse returned status %d", resp.StatusCode)
    }

    return nil
}
```

## Collector Pipeline Configuration

A real Collector configuration depends on how you wire the custom exporter. Standard Collector pipelines pass `pdata` to exporters, so an exporter that consumes `arrow.Record` batches needs a custom distribution or pipeline path that preserves those batches instead of using only the normal `pdata` exporter API. A schematic configuration looks like this:

```yaml
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      arrow:
        memory_limit_mib: 256

processors:
  batch:
    timeout: 5s
    send_batch_size: 5000

exporters:
  clickhousearrow:
    endpoint: http://clickhouse:8123
    table: otel_traces
    format: arrow_stream     # Custom exporter setting; use ArrowStream inserts
    database: otel
    timeout: 30s
    retry_on_failure:
      enabled: true
      initial_interval: 5s

service:
  pipelines:
    traces:
      receivers: [otelarrow]
      processors: [batch]
      exporters: [clickhousearrow]
```

## Performance Comparison

Illustrative benchmarks comparing Arrow insert vs row-oriented inserts into ClickHouse:

```text
Insert method          | Throughput    | CPU (Collector) | CPU (ClickHouse)
-----------------------|---------------|-----------------|------------------
SQL INSERT (batched)   | 50K spans/s   | 4 cores         | 2 cores
JSON INSERT            | 80K spans/s   | 3 cores         | 2.5 cores
Arrow INSERT           | 200K spans/s  | 1.5 cores       | 1 core
```

In a workload like this, the Arrow insert path can be 2.5-4x faster because:

1. No JSON parsing or row-value parsing for the inserted data on the ClickHouse side.
2. No JSON/protobuf encoding on the Collector side.
3. The columnar data maps naturally to ClickHouse's internal columnar layout.
4. Memory copies can be reduced since both Arrow and ClickHouse use columnar layouts.

## Other Arrow-Native Backends

ClickHouse is not the only database that supports Arrow format:

- **Apache DataFusion**: Query engine built on Arrow. Can ingest Arrow record batches directly.
- **DuckDB**: Supports Arrow format for both import and export.
- **Apache Parquet files**: Arrow record batches can be written to Parquet with minimal conversion since Parquet and Arrow share the same columnar model.

```go
// Writing Arrow batches to Parquet for archival
import (
    "os"

    "github.com/apache/arrow/go/v18/arrow"
    "github.com/apache/arrow/go/v18/parquet/pqarrow"
)

func writeToParquet(batch arrow.Record, path string) error {
    f, err := os.Create(path)
    if err != nil {
        return err
    }
    defer f.Close()

    writer, err := pqarrow.NewFileWriter(batch.Schema(), f, nil, pqarrow.DefaultWriterProps())
    if err != nil {
        return err
    }
    if err := writer.Write(batch); err != nil {
        return err
    }
    return writer.Close()
}
```

This pattern of keeping data in Arrow format from collection through processing to storage is the direction the telemetry industry is heading. The serialization tax that traditional pipelines pay at every hop can be reduced when both the transport (OTel Arrow) and the storage backend (ClickHouse, Parquet) speak the same columnar language.

# How to Use Arrow and ArrowStream Formats in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Arrow Format, ArrowStream Format, Apache Arrow, Data Engineering

Description: Learn how to use Apache Arrow and ArrowStream formats in ClickHouse for high-performance columnar data exchange with Python, Spark, and other analytics tools.

---

Apache Arrow is an in-memory columnar data format designed for efficient analytics. ClickHouse supports both Arrow (file format) and ArrowStream (streaming format) for import and export, enabling zero-copy or near-zero-copy data exchange with Python pandas, Apache Spark, DuckDB, and other Arrow-compatible tools.

## Arrow vs ArrowStream

- **Arrow**: Writes a complete IPC file with a schema header and footer. Better for file-based data exchange.
- **ArrowStream**: Writes an IPC stream without a footer. Better for streaming and pipe-based transfers.

Both formats are binary and columnar, offering excellent compression and throughput.

## Exporting Data as Arrow

```bash
clickhouse-client \
    --query "SELECT id, ts, event_type, value FROM events FORMAT Arrow" \
    > events.arrow
```

Via HTTP:

```bash
curl "http://localhost:8123/?query=SELECT+*+FROM+events+FORMAT+Arrow" \
    > events.arrow
```

## Exporting as ArrowStream

```bash
clickhouse-client \
    --query "SELECT * FROM events FORMAT ArrowStream" \
    > events.arrows
```

## Reading Arrow Files in Python

```python
import pyarrow as pa
import pyarrow.ipc as ipc

with open('events.arrow', 'rb') as f:
    reader = ipc.open_file(f)
    table = reader.read_all()

df = table.to_pandas()
print(df.head())
```

## Reading ArrowStream in Python

```python
import pyarrow as pa
import pyarrow.ipc as ipc

with open('events.arrows', 'rb') as f:
    reader = ipc.open_stream(f)
    table = reader.read_all()

df = table.to_pandas()
```

## Importing Arrow Data into ClickHouse

```bash
clickhouse-client \
    --query "INSERT INTO events FORMAT Arrow" \
    < data.arrow
```

## Arrow Integration with clickhouse-connect

The `clickhouse-connect` Python library uses Arrow natively for zero-copy transfers:

```python
import clickhouse_connect

client = clickhouse_connect.get_client(host='localhost')

# Returns a PyArrow Table directly
table = client.query_arrow('SELECT * FROM events WHERE ts >= today()')
df = table.to_pandas()
```

This avoids double serialization - data flows in Arrow format from ClickHouse directly to the Python process.

## Arrow with Apache Spark

Stock Spark does not have a built-in `arrow` file data source, but you can load an Arrow IPC file via PyArrow and hand it to Spark:

```python
import pyarrow.ipc as ipc
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName('ClickHouseExport').getOrCreate()

with open('events.arrow', 'rb') as f:
    table = ipc.open_file(f).read_all()

df = spark.createDataFrame(table.to_pandas())
df.createOrReplaceTempView('events')
spark.sql('SELECT event_type, count(*) FROM events GROUP BY event_type').show()
```

## Performance Benefits

Arrow format avoids row-by-row parsing and is well-suited for columnar engines:

```text
Format       Throughput (export, 100M rows)
Arrow        ~20 GB/s (memory-to-memory)
CSV          ~2 GB/s
JSONEachRow  ~1 GB/s
```

## Summary

Arrow and ArrowStream formats enable high-performance, type-safe columnar data exchange between ClickHouse and the broader data ecosystem. They are the preferred formats for Python analytics workflows (pandas, Polars), Spark integrations, and any pipeline where both sides support the Apache Arrow specification. Use Arrow for file-based transfers and ArrowStream for piped or streaming transfers.

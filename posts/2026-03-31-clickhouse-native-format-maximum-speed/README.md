# How to Use Native Format in ClickHouse for Maximum Speed

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Native Format, Performance, Data Transfer, Binary Format

Description: Learn how to use ClickHouse's Native binary format for maximum throughput data transfers between ClickHouse instances and clients.

---

The Native format is ClickHouse's internal binary serialization format. It is the fastest format for transferring data between ClickHouse instances or via the native TCP protocol because it requires minimal serialization/deserialization overhead - data is stored and transferred in a columnar binary layout close to what ClickHouse uses internally.

## When to Use Native Format

Use Native format when:
- Transferring data between two ClickHouse clusters or servers
- Using clickhouse-client for high-throughput bulk exports
- Building custom integrations where maximum throughput is critical
- Archiving data with perfect type fidelity

Avoid Native format when:
- The consumer is not a ClickHouse-compatible tool
- Human readability is required
- Cross-platform compatibility with non-ClickHouse tools is needed

## Exporting Data in Native Format

```bash
clickhouse-client \
    --query "SELECT * FROM events WHERE ts >= '2024-01-01' FORMAT Native" \
    > events_native.bin
```

Or via the HTTP interface (Native format is supported there too):

```bash
curl "http://localhost:8123/?query=SELECT+*+FROM+events+FORMAT+Native" \
    > events_native.bin
```

## Importing Native Format Data

```bash
clickhouse-client \
    --query "INSERT INTO events_backup FORMAT Native" \
    < events_native.bin
```

This is significantly faster than CSV or JSON for the same data volume.

## Performance Comparison

For a 100 million row table with 8 columns (mixed types):

```text
Format          Export Time   File Size
Native          ~8s           ~4.2 GB
CSV             ~45s          ~8.1 GB
JSONEachRow     ~90s          ~12.3 GB
Parquet         ~25s          ~3.8 GB
```

Native offers the best CPU efficiency at the cost of human readability and cross-tool compatibility.

## Cluster-to-Cluster Transfer

Native format is ideal for migrating data between ClickHouse clusters:

```bash
# Export from source cluster
clickhouse-client --host source-cluster \
    --query "SELECT * FROM events FORMAT Native" \
    | clickhouse-client --host dest-cluster \
        --query "INSERT INTO events FORMAT Native"
```

This pipes data directly between the two clusters with no intermediate file.

## Using with clickhouse-local

`clickhouse-local` reads Native format for efficient offline processing:

```bash
clickhouse-local \
    --query "SELECT count(), sum(value) FROM file('events_native.bin', Native)"
```

## Native Format with ClickHouse Client Libraries

The Python clickhouse-driver uses the Native binary protocol (TCP) by default:

```python
from clickhouse_driver import Client

client = Client('localhost')
rows = client.execute('SELECT * FROM events LIMIT 1000000')
# Data transferred using Native format over TCP
```

## Inspecting Native Files

Native files are binary and not human-readable, but you can inspect them with:

```bash
clickhouse-local \
    --query "SELECT * FROM file('data.bin', Native) LIMIT 5"
```

## Summary

The Native format is ClickHouse's fastest data transfer mechanism, ideal for cluster migrations, high-throughput backups, and inter-ClickHouse pipelines. It preserves all data types perfectly and avoids the CPU overhead of text encoding. Use it whenever both the source and destination are ClickHouse-compatible tools, and fall back to Parquet for cross-tool compatibility with comparable performance.

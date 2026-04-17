# Validation Summary: How to Use Arrow and ArrowStream Formats in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Arrow and ArrowStream formats)
- Apache Arrow IPC (File and Streaming formats)
- PyArrow (`pyarrow.ipc`)
- clickhouse-client CLI
- ClickHouse HTTP interface
- clickhouse-connect Python library
- Apache Spark / PySpark

## Sources Consulted
- ClickHouse `Arrow` format docs: https://clickhouse.com/docs/interfaces/formats/Arrow
- ClickHouse `ArrowStream` format docs: https://clickhouse.com/docs/interfaces/formats/ArrowStream
- PyArrow IPC docs: https://arrow.apache.org/docs/python/ipc.html
- clickhouse-connect docs (Python integration / `query_arrow`): https://clickhouse.com/docs/integrations/python
- Apache Spark DataFrameReader API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameReader.format.html
- Apache Spark SQL Data Sources guide: https://spark.apache.org/docs/latest/sql-data-sources.html
- Spark Arrow / pandas integration: https://spark.apache.org/docs/latest/api/python/user_guide/sql/arrow_pandas.html

## Issues Found
- **Incorrect Spark Arrow data source**: The original "Arrow with Apache Spark" section used `spark.read.format('arrow').load('events.arrow')`. Apache Spark does not ship with a built-in `arrow` file data source — Spark uses Arrow internally for pandas UDF / `toPandas()` serialization, not as a file reader — so the call would fail with `ClassNotFoundException` on stock Spark. Fixed by loading the Arrow IPC file via `pyarrow.ipc.open_file(...)` and converting to a Spark DataFrame with `spark.createDataFrame(table.to_pandas())`.

## Review Notes
- The distinction between `Arrow` (IPC file with footer, random access) and `ArrowStream` (IPC streaming, no footer) is accurate, and the PyArrow reader pairing (`open_file` vs `open_stream`) is correct.
- `clickhouse-connect`'s `query_arrow()` method returning a `pyarrow.Table` is correct; it uses the `ArrowStream` format on the wire.
- The throughput numbers in the "Performance Benefits" table are illustrative and hardware-dependent; they are presented as rough orders of magnitude rather than benchmarks, which is acceptable for a guide but readers should not rely on them as authoritative figures.
- The `.arrow` / `.arrows` file extensions are conventions only; ClickHouse does not enforce them.

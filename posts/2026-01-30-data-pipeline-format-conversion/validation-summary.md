# Validation Summary: How to Build Data Format Conversion

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- CSV
- JSON and JSON Lines
- Apache Parquet
- Apache Avro
- PyArrow
- fastavro
- Apache Spark / PySpark
- Protocol Buffers
- Data quality validation
- Schema evolution

## Sources Consulted
- Python csv module documentation: https://docs.python.org/3/library/csv.html
- Python json module documentation: https://docs.python.org/3/library/json.html
- Apache Arrow PyArrow ParquetFile documentation: https://arrow.apache.org/docs/python/generated/pyarrow.parquet.ParquetFile.html
- Apache Arrow PyArrow Table / RecordBatch conversion documentation: https://arrow.apache.org/docs/python/generated/pyarrow.Table.html
- Apache Spark Parquet data source documentation: https://spark.apache.org/docs/latest/sql-data-sources-parquet.html
- Apache Spark DataFrame.coalesce documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.coalesce.html
- Apache Spark DataFrameWriter.partitionBy documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.partitionBy.html
- Apache Spark DataFrameWriter.parquet documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.parquet.html
- fastavro documentation: https://fastavro.readthedocs.io/
- fastavro writer documentation: https://fastavro.readthedocs.io/en/latest/writer.html
- Apache Avro specification: https://avro.apache.org/docs/1.11.1/specification/
- Protocol Buffers overview: https://protobuf.dev/overview/
- Protocol Buffers encoding guide: https://protobuf.dev/programming-guides/encoding/

## Issues Found
- The introduction claimed storage costs could scale "linearly versus exponentially" based on format choice. Changed this to "predictably versus steeply" because file formats can materially change storage use, but exponential cost scaling is not an inherent property of format conversion.
- The format comparison matrix described Protocol Buffers as having "Good" compression. Changed this to "N/A (compact encoding)" because Protocol Buffers provide compact binary encoding but do not perform compression by themselves.
- The CSV converter exposed a `has_header` option but always used `csv.DictReader` as if a header existed. Added schema-based field names for headerless files and a clear error when headerless input has no schema.
- The CSV converter did not map `long` or `int64` even though later examples used `long` in schemas. Added integer coercion for both names.
- The JSON converter docstring said it automatically detected JSONL versus array JSON, but the code used the configured mode. Updated the wording to match behavior.
- The Parquet converter claimed broad schema evolution support. Narrowed the language to schema preservation and compatible schema changes.
- The Parquet reader contained a no-op placeholder loop and then converted row groups through pandas. Replaced it with `ParquetFile.iter_batches()` and `RecordBatch.to_pylist()` for working batch iteration.
- The Parquet converter did not map `long`, so the complete pipeline's `id: long` field would have become a string. Added `long` as `pa.int64()`.
- The Parquet and Avro validators allowed `None` in non-nullable schema fields. Updated them to reject nulls for required fields.
- The Parquet writer attempted to stat the destination even when no records were written. Added a clear `ValueError` for empty input.
- The Avro schema builder made nullable fields unions but did not include `default: None`, which can break missing nullable fields under Avro schema rules. Added null defaults for nullable and inferred nullable fields.
- The Spark CSV and Parquet writers created `DataFrameWriter` objects before applying `coalesce()`, so the coalesced DataFrame would not be written. Moved `coalesce()` before writer creation.
- The Spark Parquet recommendation suggested partitioning by high-cardinality columns. Changed this to low- to moderate-cardinality filter columns to avoid small-file and excessive-partition problems.
- The Spark JSON output path ignored the `partition_by` argument in `convert()`. Updated the JSON writer lambda to honor partitioning.
- The partition analysis example used a Python dictionary with duplicate `count` keys for multiple aggregations, leaving only one aggregation at runtime. Replaced it with explicit Spark aggregate functions and aliases.
- The partition optimizer divided by zero for empty DataFrames and used floor division for target partition count. Added an empty-DataFrame guard and used `math.ceil`.
- The schema evolution section overstated native schema evolution support. Clarified that compatibility depends on the exact schema change and reader implementation.

## Review Notes
The Python snippets were parsed with `python3 ast.parse`; all 11 Python code blocks are syntactically valid after the fixes. Runtime execution was not performed because the examples depend on PyArrow, fastavro, PySpark, and external data sources that are not configured in this blog workspace.

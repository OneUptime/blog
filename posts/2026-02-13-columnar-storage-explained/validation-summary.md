# Validation Summary: Columnar Storage Explained - Why It Matters for Analytics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Parquet
- Apache ORC
- Apache Arrow
- PyArrow
- DuckDB
- Spark
- Columnar storage, predicate pushdown, compression, and data lake layout

## Sources Consulted
- Apache Parquet file format documentation: https://parquet.apache.org/docs/file-format/
- Apache Parquet concepts documentation: https://parquet.apache.org/docs/concepts/
- Apache Arrow overview: https://arrow.apache.org/overview/
- PyArrow `pyarrow.parquet.write_table` API documentation: https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html
- PyArrow `pyarrow.parquet.read_table` API documentation: https://arrow.apache.org/docs/python/generated/pyarrow.parquet.read_table.html
- Apache ORC indexes documentation: https://orc.apache.org/docs/indexes.html
- DuckDB Parquet documentation: https://duckdb.org/docs/stable/data/parquet/overview
- Apache Spark generic load/save functions documentation: https://spark.apache.org/docs/3.5.5/sql-data-sources-load-save-functions.html

## Issues Found
- The post grouped Arrow with on-disk columnar storage formats. Apache Arrow is an in-memory columnar format, so the text now distinguishes on-disk formats like Parquet and ORC from Arrow's in-memory format.
- The PyArrow write example used `date(...)` without importing `date`. Added `from datetime import date` so the snippet is syntactically complete.
- The PyArrow write example described `row_group_size=128 * 1024 * 1024` as a 128 MB row group size. PyArrow's `row_group_size` is a maximum number of rows, not bytes. Updated the comment and value to use `row_group_size=1_000_000`.
- The text said `pa.dictionary()` tells Parquet to use dictionary encoding. PyArrow's `use_dictionary` writer option controls Parquet dictionary encoding, while `pa.dictionary()` defines the Arrow column type. Updated the explanation to mention both.
- The ORC comparison said ORC includes bloom filters by default for string columns. ORC documentation says indexes can include bloom filters; they are configured for selected columns. Updated the wording accordingly.

## Review Notes
The remaining performance claims are directionally accurate but workload-dependent. Compression ratios, speedups, and ideal file sizes vary by data shape, sort order, query engine, codec settings, and cloud/object storage behavior.

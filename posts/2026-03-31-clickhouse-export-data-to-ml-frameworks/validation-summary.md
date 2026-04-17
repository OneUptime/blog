# Validation Summary: How to Export ClickHouse Data to ML Frameworks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, `INTO OUTFILE ... FORMAT Parquet`)
- `clickhouse-connect` Python driver (`query_df`, `query`, `query_rows_stream`, `query_arrow`, `insert`)
- Pandas (`read_parquet`, DataFrame)
- NumPy
- PyTorch (`IterableDataset`, `DataLoader`)
- scikit-learn (`RandomForestClassifier`)
- Apache Arrow / PyArrow (`Table.to_pandas`)
- Parquet file format

## Sources Consulted
- clickhouse-connect source (`Client` class, methods `query`, `query_df`, `query_df_arrow`, `query_rows_stream`, `query_arrow`, `insert`) — https://github.com/ClickHouse/clickhouse-connect/blob/main/clickhouse_connect/driver/client.py
- clickhouse-connect `QueryResult` (`result_rows` property) — https://github.com/ClickHouse/clickhouse-connect/blob/main/clickhouse_connect/driver/query.py
- ClickHouse `INTO OUTFILE` docs — https://clickhouse.com/docs/en/sql-reference/statements/select/into-outfile
- ClickHouse Python integration docs — https://clickhouse.com/docs/en/integrations/python
- PyArrow `Table.to_pandas()` reference — https://arrow.apache.org/docs/python/generated/pyarrow.Table.html
- PyTorch `IterableDataset` / `DataLoader` docs — https://pytorch.org/docs/stable/data.html
- scikit-learn `RandomForestClassifier` docs — https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html

## Issues Found
- **"Arrow-backed DataFrame" claim for `query_df` (corrected).** The post stated that `clickhouse-connect` returns an "Arrow-backed DataFrame" from `query_df`. This is inaccurate: `query_df` returns a standard pandas DataFrame built column-wise from ClickHouse's Native format via NumPy. The Arrow-backed variant is a separate method, `query_df_arrow`, which uses PyArrow extension dtypes. Updated the sentence to describe the actual column-wise Native-format path and to point readers to `query_df_arrow` when they want PyArrow dtypes.

## Review Notes
- `SELECT ... INTO OUTFILE '/path' FORMAT Parquet` is valid ClickHouse SQL, but it is a **client-side** feature available only through `clickhouse-client` and `clickhouse-local`; it fails over the HTTP interface (which `clickhouse-connect` uses). The post presents it as a plain SQL snippet without specifying the execution context, which is technically fine but could mislead readers who try to run it via an HTTP driver. Not corrected since the SQL itself is accurate.
- The comment "Convert to pandas without copying data" next to `pyarrow.Table.to_pandas()` is somewhat loose — conversion is zero-copy for simple numeric types but not for strings/objects in general. Acceptable as written but worth tightening in a future revision.
- In the PyTorch example, the feature-index lookup (`row[self.feature_cols.index(c)] for c in self.feature_cols`) produces `0, 1, 2` because `feature_cols` matches the leading columns of the query verbatim; it is not a general-purpose mapping against arbitrary SELECT orderings. Works for the shown example.
- `RandomForestClassifier` accepts `float32` labels; training will succeed even though integer labels would be the more conventional choice for classification.
- API signatures verified: `insert`'s second positional parameter is named `data` (not `rows`) internally, but positional invocation with `column_names` as keyword (as shown) is supported.

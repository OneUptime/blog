# Validation Summary: How to Use ETL Pipelines to Load Data into MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (PyMongo driver)
- Python (psycopg2, pandas, pymongo)
- PostgreSQL (as source database)
- ETL pipeline patterns (batching, upserts, watermarks)

## Sources Consulted
- PyMongo `bulk_write` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.bulk_write
- PyMongo `UpdateOne` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/operations.html#pymongo.operations.UpdateOne
- PyMongo `BulkWriteError` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/errors.html#pymongo.errors.BulkWriteError
- PyMongo `BulkWriteResult` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/results.html#pymongo.results.BulkWriteResult
- psycopg2 documentation: https://www.psycopg.org/docs/
- pandas `read_sql_query` documentation: https://pandas.pydata.org/docs/reference/api/pandas.read_sql_query.html
- Python `datetime.utcnow()` deprecation notice: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow

## Issues Found

1. **Architecture diagram showed `insert_many()` instead of `bulk_write()`**: The ASCII diagram listed `insert_many()` as the load method, but all code examples use `bulk_write()` with `UpdateOne` upsert operations. Changed to `bulk_write()` to match the actual implementation.

2. **Missing `import pandas as pd` in Transform phase code block**: The transformation function uses `pd.notna()` but the code block only imported `from datetime import datetime`. The `pd` alias was defined in a separate code block (the extract phase) and would not be available in the transform block's scope. Added `import pandas as pd` to the transform code block.

3. **`BulkWriteError` handler discarded partial success counts**: When `bulk_write` with `ordered=False` partially fails, it raises `BulkWriteError` but the successful operations still complete. The original handler only counted errors and printed `nInserted` (which would be 0 for upsert operations). Fixed to accumulate `nUpserted` and `nModified` from `e.details` so the final totals are accurate, and changed the print message to report the actual write error count.

## Review Notes
- `datetime.utcnow()` is deprecated since Python 3.12 in favor of `datetime.now(datetime.UTC)`. The code still works but may warrant updating in a future revision.
- The watermark SQL query uses f-string interpolation (`f"SELECT * FROM customers WHERE updated_at > '{last_run}'"`) instead of parameterized queries. While `last_run` comes from a controlled source (MongoDB), this is generally discouraged as it could be a SQL injection vector. A future revision could use parameterized queries for better practice.
- The post correctly demonstrates idempotent ETL via upserts, batch processing, and incremental watermarks -- all sound patterns for MongoDB data loading.

# How to Stream BigQuery Results into a Pandas DataFrame for Large Dataset Processing in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Pandas, Python, Data Engineering

Description: Learn how to efficiently stream large BigQuery result sets into Pandas DataFrames using pagination, the Storage API, and chunked processing techniques.

---

When your BigQuery query returns a few thousand rows, calling `to_dataframe()` works perfectly. But when you are dealing with millions or tens of millions of rows, loading everything into memory at once is not practical. Your process will either run out of memory or take forever. The solution is to stream results in chunks and process them incrementally. This post covers several approaches to handling large BigQuery results in Python.

## The Problem with to_dataframe() on Large Results

Let me show you what happens when you naively try to load a large result set.

```python
from google.cloud import bigquery

client = bigquery.Client()

# This query might return hundreds of millions of rows
query = """
    SELECT *
    FROM `my-project.logs.application_events`
    WHERE DATE(event_timestamp) BETWEEN '2024-01-01' AND '2024-12-31'
"""

# This will try to load everything into memory at once - bad idea for large results
# df = client.query(query).to_dataframe()  # Could use 50+ GB of RAM
```

For large datasets, you need to process data in manageable chunks.

## Using the BigQuery Storage API for Fast Streaming

The BigQuery Storage API (also called the Read API) is the fastest way to read large amounts of data from BigQuery. It uses the Apache Arrow format for efficient data transfer and supports parallel reads.

```bash
# Install the required packages
pip install google-cloud-bigquery google-cloud-bigquery-storage pyarrow pandas
```

```python
from google.cloud import bigquery

client = bigquery.Client()

query = """
    SELECT
        user_id,
        event_type,
        event_timestamp,
        properties
    FROM `my-project.logs.events`
    WHERE DATE(event_timestamp) = '2024-06-15'
"""

# Execute the query
query_job = client.query(query)

# Use to_dataframe with the BigQuery Storage API for faster transfer
# When pyarrow and google-cloud-bigquery-storage are installed,
# this automatically uses the Storage API for reads
df = query_job.to_dataframe(
    create_bqstorage_client=True,  # Explicitly request Storage API usage
    progress_bar_type="tqdm",       # Show a progress bar during download
)

print(f"Loaded {len(df)} rows, {df.memory_usage(deep=True).sum() / 1e6:.1f} MB in memory")
```

## Streaming with Page-Based Iteration

For results that are too large to fit in memory, process them page by page.

```python
from google.cloud import bigquery
import pandas as pd

client = bigquery.Client()

query = """
    SELECT *
    FROM `my-project.analytics.page_views`
    WHERE DATE(view_timestamp) >= '2024-01-01'
"""

query_job = client.query(query)

# Get the result iterator
result = query_job.result(page_size=10000)  # 10,000 rows per page

# Process each page as a separate DataFrame
total_rows = 0
aggregated_results = []

for page in result.pages:
    # Convert this page to a DataFrame
    page_df = page.to_dataframe()
    total_rows += len(page_df)

    # Process the chunk - aggregate, filter, or write to disk
    page_summary = page_df.groupby("page_path").agg(
        views=("view_id", "count"),
        unique_users=("user_id", "nunique"),
    ).reset_index()

    aggregated_results.append(page_summary)
    print(f"Processed {total_rows} rows so far...")

# Combine the aggregated results from all pages
final_df = pd.concat(aggregated_results).groupby("page_path").sum().reset_index()
print(f"Final result: {len(final_df)} unique pages from {total_rows} total rows")
```

## Using to_dataframe_iterable for Chunk Processing

The `to_dataframe_iterable()` method is purpose-built for streaming large results as DataFrames.

```python
from google.cloud import bigquery
import pandas as pd

client = bigquery.Client()

query = """
    SELECT
        user_id,
        session_id,
        page_path,
        duration_seconds,
        DATE(session_start) as session_date
    FROM `my-project.analytics.sessions`
    WHERE session_start >= '2024-01-01'
"""

query_job = client.query(query)

# to_dataframe_iterable yields DataFrames in chunks
# Each chunk has max_results rows
chunk_iterator = query_job.result().to_dataframe_iterable(
    max_results=50000  # 50,000 rows per chunk
)

# Process each chunk and write results to a Parquet file
output_chunks = []

for i, chunk_df in enumerate(chunk_iterator):
    # Filter to sessions longer than 30 seconds
    filtered = chunk_df[chunk_df["duration_seconds"] > 30]

    # Calculate per-user metrics for this chunk
    user_metrics = filtered.groupby("user_id").agg(
        total_sessions=("session_id", "count"),
        avg_duration=("duration_seconds", "mean"),
        total_pages=("page_path", "count"),
    ).reset_index()

    output_chunks.append(user_metrics)
    print(f"Chunk {i}: processed {len(chunk_df)} rows, kept {len(filtered)} sessions")

# Combine all chunks into a final result
final_metrics = pd.concat(output_chunks).groupby("user_id").agg(
    total_sessions=("total_sessions", "sum"),
    avg_duration=("avg_duration", "mean"),
    total_pages=("total_pages", "sum"),
).reset_index()

print(f"Final user metrics: {len(final_metrics)} users")
```

## Writing Chunks Directly to Parquet

When you are processing data that ultimately needs to be stored, writing chunks directly to disk avoids holding everything in memory.

```python
from google.cloud import bigquery
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

client = bigquery.Client()

query = """
    SELECT *
    FROM `my-project.warehouse.transactions`
    WHERE transaction_date >= '2024-01-01'
"""

query_job = client.query(query)

# Write results directly to a Parquet file in chunks
writer = None
total_rows = 0

for page in query_job.result(page_size=50000).pages:
    chunk_df = page.to_dataframe()
    total_rows += len(chunk_df)

    # Convert the DataFrame chunk to an Arrow table
    table = pa.Table.from_pandas(chunk_df)

    if writer is None:
        # Create the Parquet writer with the schema from the first chunk
        writer = pq.ParquetWriter("output/transactions.parquet", table.schema)

    writer.write_table(table)
    print(f"Written {total_rows} rows to parquet...")

if writer:
    writer.close()
    print(f"Finished writing {total_rows} rows to transactions.parquet")
```

## Streaming to Cloud Storage

For even larger datasets, stream the processed results directly to Cloud Storage instead of local disk.

```python
from google.cloud import bigquery, storage
import pandas as pd
import io

bq_client = bigquery.Client()
gcs_client = storage.Client()

query = """
    SELECT *
    FROM `my-project.warehouse.large_table`
    WHERE year = 2024
"""

query_job = bq_client.query(query)
bucket = gcs_client.bucket("my-output-bucket")

chunk_number = 0

for page in query_job.result(page_size=100000).pages:
    chunk_df = page.to_dataframe()

    # Write each chunk as a separate CSV file in GCS
    csv_buffer = io.BytesIO()
    chunk_df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)

    blob_name = f"exports/large_table/chunk_{chunk_number:04d}.csv"
    blob = bucket.blob(blob_name)
    blob.upload_from_file(csv_buffer, content_type="text/csv")

    print(f"Uploaded {blob_name} ({len(chunk_df)} rows)")
    chunk_number += 1

print(f"Exported {chunk_number} chunks to gs://my-output-bucket/exports/large_table/")
```

## Using BigQuery Export for Very Large Datasets

When your result set is truly massive (hundreds of millions of rows), the most efficient approach is to use BigQuery's built-in export to Cloud Storage and then read the files.

```python
from google.cloud import bigquery

client = bigquery.Client()

# First, save the query results to a temporary table
query = """
    SELECT *
    FROM `my-project.warehouse.huge_table`
    WHERE partition_date >= '2024-01-01'
"""

# Write results to a destination table
job_config = bigquery.QueryJobConfig(
    destination="my-project.temp.export_staging",
    write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
)

query_job = client.query(query, job_config=job_config)
query_job.result()  # Wait for query to finish
print(f"Query results saved to staging table: {query_job.total_bytes_processed} bytes processed")

# Export the table to GCS as Parquet files
# BigQuery will automatically shard into multiple files
destination_uri = "gs://my-export-bucket/exports/huge_table/*.parquet"
table_ref = client.dataset("temp").table("export_staging")

extract_job = client.extract_table(
    table_ref,
    destination_uri,
    job_config=bigquery.ExtractJobConfig(
        destination_format=bigquery.DestinationFormat.PARQUET,
    ),
)

extract_job.result()  # Wait for export to finish
print("Export complete. Files available in GCS.")

# Now read the Parquet files with Pandas (or Dask/Spark for parallel processing)
import pandas as pd

# Read a single shard
df = pd.read_parquet("gs://my-export-bucket/exports/huge_table/000000000000.parquet")
```

## Memory Estimation

Before processing, estimate how much memory your results will need.

```python
from google.cloud import bigquery

client = bigquery.Client()

query = "SELECT * FROM `my-project.data.big_table` WHERE year = 2024"

# Dry run to estimate data size
job_config = bigquery.QueryJobConfig(dry_run=True, use_query_cache=False)
dry_run_job = client.query(query, job_config=job_config)

bytes_to_scan = dry_run_job.total_bytes_processed
gb_to_scan = bytes_to_scan / (1024 ** 3)

# Rough rule of thumb: Pandas DataFrames use about 2-5x the raw data size
estimated_memory_gb = gb_to_scan * 3  # Conservative middle estimate

print(f"Data to scan: {gb_to_scan:.2f} GB")
print(f"Estimated memory for DataFrame: {estimated_memory_gb:.2f} GB")

if estimated_memory_gb > 8:
    print("Consider using chunked processing or BigQuery export")
else:
    print("Should fit comfortably in memory with to_dataframe()")
```

## Monitoring Data Pipeline Performance

When you run large data processing jobs in production, you need visibility into execution times, memory usage, and failures. OneUptime (https://oneuptime.com) can monitor your data pipeline services and alert you when processing takes longer than expected or when your services run into resource limits.

## Summary

The right approach for streaming BigQuery results into Pandas depends on your data size. For up to a few million rows, `to_dataframe()` with the Storage API and pyarrow is usually fast enough. For tens of millions of rows, use `to_dataframe_iterable()` or page-based processing to work in chunks. For hundreds of millions or more, export to Cloud Storage first and process the files with tools designed for that scale. The key principle is simple: never try to hold more data in memory than you actually need at any given moment.

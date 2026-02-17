# How to Query BigQuery Datasets from Python Using the google-cloud-bigquery Library and Pandas DataFrames

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Python, Pandas, Data Analysis

Description: Learn how to query BigQuery datasets from Python using the google-cloud-bigquery client library and convert results directly into Pandas DataFrames for analysis.

---

BigQuery is one of those services that completely changed how I think about querying large datasets. Before I started using it, I was used to spinning up database instances, managing indexes, and worrying about query performance at scale. With BigQuery, you write SQL, point it at terabytes of data, and get results in seconds. The best part? The Python client library makes it feel like you are working with a local database.

In this post, I will walk through how to use the `google-cloud-bigquery` library to query datasets and load results into Pandas DataFrames. This is a pattern I use constantly for data analysis, reporting, and feeding data into ML pipelines.

## Setting Up Your Environment

First, you need to install the required packages. The BigQuery library has an optional Pandas integration that you should always install alongside it.

```bash
# Install the BigQuery client library with Pandas support
pip install google-cloud-bigquery pandas db-dtypes pyarrow
```

The `db-dtypes` package handles BigQuery-specific data types like DATE and TIME when converting to Pandas. The `pyarrow` package speeds up data transfer significantly by using the Arrow format.

## Authenticating with BigQuery

Before running queries, you need to authenticate. If you are running locally, the easiest approach is to use Application Default Credentials.

```bash
# Log in with your Google account for local development
gcloud auth application-default login
```

For production environments, you would typically use a service account. But for development, ADC works perfectly.

## Running Your First Query

Here is a basic example that queries a public dataset and loads the results into a DataFrame.

```python
from google.cloud import bigquery
import pandas as pd

# Create a BigQuery client - it automatically picks up your project from ADC
client = bigquery.Client()

# Write a standard SQL query against the public stackoverflow dataset
query = """
    SELECT
        tags,
        COUNT(*) as question_count,
        AVG(answer_count) as avg_answers
    FROM `bigquery-public-data.stackoverflow.posts_questions`
    WHERE creation_date >= '2023-01-01'
    GROUP BY tags
    ORDER BY question_count DESC
    LIMIT 20
"""

# Execute the query and convert results directly to a Pandas DataFrame
df = client.query(query).to_dataframe()

print(df.head())
print(f"Total rows returned: {len(df)}")
```

The `to_dataframe()` method is doing the heavy lifting here. It handles all the type conversions and pagination automatically. Under the hood, it uses the BigQuery Storage API when `pyarrow` is installed, which is much faster than the default REST-based approach.

## Parameterized Queries

Hardcoding values in SQL strings is a bad habit. BigQuery supports parameterized queries that prevent SQL injection and make your code cleaner.

```python
from google.cloud import bigquery

client = bigquery.Client()

# Define the query with named parameters using @param syntax
query = """
    SELECT name, SUM(number) as total
    FROM `bigquery-public-data.usa_names.usa_1910_2013`
    WHERE state = @state
    AND year >= @start_year
    GROUP BY name
    ORDER BY total DESC
    LIMIT @limit
"""

# Configure the query parameters with their types
job_config = bigquery.QueryJobConfig(
    query_parameters=[
        bigquery.ScalarQueryParameter("state", "STRING", "CA"),
        bigquery.ScalarQueryParameter("start_year", "INT64", 2000),
        bigquery.ScalarQueryParameter("limit", "INT64", 10),
    ]
)

# Execute the parameterized query
df = client.query(query, job_config=job_config).to_dataframe()
print(df)
```

This is especially useful when you are building query functions that accept user input or when you want to reuse the same query template with different parameters.

## Querying Your Own Datasets

Public datasets are great for learning, but you will mostly be querying your own project's datasets.

```python
from google.cloud import bigquery

# Specify your project explicitly if needed
client = bigquery.Client(project="my-gcp-project")

# Query a table in your own dataset
query = """
    SELECT
        user_id,
        event_type,
        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), event_timestamp, HOUR) as hours_ago
    FROM `my-gcp-project.analytics.user_events`
    WHERE DATE(event_timestamp) = CURRENT_DATE()
    ORDER BY event_timestamp DESC
"""

# Set a destination table to cache results for repeated access
job_config = bigquery.QueryJobConfig(
    destination="my-gcp-project.analytics.daily_summary",
    write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
)

df = client.query(query, job_config=job_config).to_dataframe()
print(f"Processed {len(df)} events for today")
```

## Working with Large Results

When your query returns millions of rows, loading everything into memory at once is not practical. You can use pagination or the BigQuery Storage API for streaming.

```python
from google.cloud import bigquery

client = bigquery.Client()

query = """
    SELECT *
    FROM `my-gcp-project.logs.application_logs`
    WHERE DATE(timestamp) BETWEEN '2024-01-01' AND '2024-12-31'
"""

# Use the list_rows approach for paginated access
query_job = client.query(query)

# Process results in chunks instead of loading everything at once
chunks = []
for page in query_job.result().pages:
    chunk_df = page.to_dataframe()
    # Process each chunk - filter, aggregate, or write to disk
    chunks.append(chunk_df)
    print(f"Processed chunk with {len(chunk_df)} rows")

# Combine if needed (or process individually)
full_df = pd.concat(chunks, ignore_index=True)
```

## Controlling Query Costs

BigQuery charges by the amount of data scanned. You should always estimate costs before running expensive queries.

```python
from google.cloud import bigquery

client = bigquery.Client()

query = """
    SELECT *
    FROM `bigquery-public-data.github_repos.commits`
    WHERE EXTRACT(YEAR FROM committer.date) = 2023
"""

# Run a dry run first to see how much data the query will scan
job_config = bigquery.QueryJobConfig(dry_run=True, use_query_cache=False)
query_job = client.query(query, job_config=job_config)

# Convert bytes to GB for readability
bytes_estimate = query_job.total_bytes_processed
gb_estimate = bytes_estimate / (1024 ** 3)
cost_estimate = gb_estimate * 6.25  # On-demand pricing per TB = $6.25, per GB = $6.25/1024

print(f"This query will scan {gb_estimate:.2f} GB")
print(f"Estimated cost: ${cost_estimate:.4f}")
```

## Using DataFrames with BigQuery Results

Once you have your data in a DataFrame, you can do all the usual Pandas operations. Here is a practical example that combines BigQuery with Pandas analysis.

```python
from google.cloud import bigquery
import pandas as pd

client = bigquery.Client()

# Pull HTTP response time data from a logs table
query = """
    SELECT
        endpoint,
        response_time_ms,
        status_code,
        EXTRACT(HOUR FROM request_timestamp) as hour_of_day
    FROM `my-project.api_logs.requests`
    WHERE DATE(request_timestamp) = CURRENT_DATE()
"""

df = client.query(query).to_dataframe()

# Calculate percentiles per endpoint using Pandas
summary = df.groupby('endpoint').agg(
    p50=('response_time_ms', lambda x: x.quantile(0.5)),
    p95=('response_time_ms', lambda x: x.quantile(0.95)),
    p99=('response_time_ms', lambda x: x.quantile(0.99)),
    error_rate=('status_code', lambda x: (x >= 500).mean()),
    total_requests=('status_code', 'count')
).sort_values('total_requests', ascending=False)

print(summary.head(10))
```

## Writing DataFrames Back to BigQuery

Sometimes you need to write processed results back to BigQuery. The client library makes this straightforward.

```python
from google.cloud import bigquery
import pandas as pd

client = bigquery.Client()

# Create a DataFrame with your processed data
results_df = pd.DataFrame({
    'metric_name': ['cpu_usage', 'memory_usage', 'disk_io'],
    'avg_value': [45.2, 72.8, 15.3],
    'max_value': [98.1, 95.4, 88.7],
    'report_date': pd.to_datetime(['2024-01-15'] * 3)
})

# Define the destination table
table_id = "my-project.reports.daily_metrics"

# Configure the load job to append to the existing table
job_config = bigquery.LoadJobConfig(
    write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
)

# Load the DataFrame into BigQuery
job = client.load_table_from_dataframe(results_df, table_id, job_config=job_config)
job.result()  # Wait for the job to complete

print(f"Loaded {job.output_rows} rows into {table_id}")
```

## Monitoring with OneUptime

When you are running BigQuery queries in production - say, in a scheduled pipeline or an API endpoint - you want to know when things break. Query failures, unexpected empty results, or cost spikes can all indicate problems. OneUptime (https://oneuptime.com) can monitor your BigQuery-powered services and alert you when response times degrade or when your data pipelines stop producing expected results.

## Wrapping Up

The `google-cloud-bigquery` library paired with Pandas is a powerful combination for data work on GCP. The key things to remember are: always install `pyarrow` for faster data transfers, use parameterized queries to keep your code clean and safe, run dry runs before expensive queries, and process large results in chunks to avoid memory issues. Once you get comfortable with this workflow, switching between interactive analysis and production pipelines becomes much easier.

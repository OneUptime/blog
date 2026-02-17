# How to Estimate BigQuery Query Costs Before Running with Dry Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Cost Management, Dry Run, Query Optimization

Description: Learn how to use BigQuery dry run to estimate query costs before execution, preventing expensive surprises and optimizing your queries.

---

One of the most common surprises with BigQuery on-demand pricing is getting a bill for a query that scanned way more data than expected. A query that looks simple might scan terabytes if it hits an unpartitioned table without proper filters. BigQuery's dry run feature lets you check how much data a query will process before actually running it, giving you a chance to optimize or cancel before the charges hit.

In this post, I will show you how to use dry runs through the console, CLI, and API, and share patterns for building cost estimation into your workflows.

## What a Dry Run Does

A dry run validates your SQL query and returns metadata about what would happen if the query ran, but it does not actually execute it. The most important piece of metadata is the total bytes that would be processed, which directly determines the cost under on-demand pricing.

Dry runs are free. They do not scan any data and do not count against any quotas. You can run as many dry runs as you want.

## Using Dry Run in the BigQuery Console

The simplest way to use dry run is right in the BigQuery console in the Cloud Console. When you type a query in the query editor, BigQuery automatically validates it and shows the estimated bytes to be processed in the upper right corner of the editor. This happens in real-time as you type.

The estimate shown is the upper bound of data that will be scanned. The actual bytes processed may be lower due to caching or query optimizations, but for cost estimation purposes, use the upper bound number.

## Using Dry Run with bq CLI

The bq command-line tool supports dry runs with the --dry_run flag.

```bash
# Estimate how much data a query will process
bq query --dry_run --use_legacy_sql=false \
  'SELECT user_id, event_type, timestamp
   FROM `my_project.analytics.events`
   WHERE DATE(timestamp) = "2026-02-15"'
```

The output shows the total bytes that would be processed.

```
Query successfully validated. Assuming the tables are not modified,
running this query will process 2.4 GB of data.
```

You can also get the output in JSON format for programmatic parsing.

```bash
# Get dry run results in JSON format
bq query --dry_run --use_legacy_sql=false --format=json \
  'SELECT user_id, event_type, timestamp
   FROM `my_project.analytics.events`
   WHERE DATE(timestamp) = "2026-02-15"'
```

## Using Dry Run with the Python Client

For integrating cost estimation into applications or data pipelines, the Python client library provides dry run support.

```python
from google.cloud import bigquery

# Initialize the BigQuery client
client = bigquery.Client()

# Define the query
query = """
SELECT
    user_id,
    event_type,
    COUNT(*) as event_count
FROM `my_project.analytics.events`
WHERE DATE(timestamp) BETWEEN '2026-01-01' AND '2026-01-31'
GROUP BY user_id, event_type
"""

# Configure the job as a dry run
job_config = bigquery.QueryJobConfig(dry_run=True, use_query_cache=False)

# Execute the dry run
query_job = client.query(query, job_config=job_config)

# Calculate the estimated cost
# On-demand pricing: $6.25 per TB (as of 2026)
bytes_processed = query_job.total_bytes_processed
gb_processed = bytes_processed / (1024 ** 3)
tb_processed = bytes_processed / (1024 ** 4)
estimated_cost = tb_processed * 6.25

print(f"Bytes to process: {bytes_processed:,}")
print(f"GB to process: {gb_processed:.2f}")
print(f"Estimated cost: ${estimated_cost:.4f}")
```

## Using Dry Run with the REST API

You can also call the dry run through the REST API directly, which is useful for integrations in any language.

```bash
# Execute a dry run via the REST API
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://bigquery.googleapis.com/bigquery/v2/projects/my-project/jobs" \
  -d '{
    "configuration": {
      "query": {
        "query": "SELECT * FROM `my_project.analytics.events` WHERE DATE(timestamp) = \"2026-02-15\"",
        "useLegacySql": false
      },
      "dryRun": true
    }
  }'
```

The response includes `totalBytesProcessed` in the statistics field.

## Building a Cost Estimation Wrapper

A practical pattern is wrapping your query execution in a function that checks the cost first and requires confirmation if it exceeds a threshold.

```python
from google.cloud import bigquery

def run_query_with_cost_check(query, max_cost_dollars=10.0, price_per_tb=6.25):
    """
    Run a BigQuery query, but check the estimated cost first.
    Raises an exception if the cost exceeds the threshold.
    """
    client = bigquery.Client()

    # Step 1: Run dry run to estimate cost
    dry_run_config = bigquery.QueryJobConfig(
        dry_run=True,
        use_query_cache=False
    )
    dry_run_job = client.query(query, job_config=dry_run_config)

    # Calculate estimated cost
    tb_processed = dry_run_job.total_bytes_processed / (1024 ** 4)
    estimated_cost = tb_processed * price_per_tb

    print(f"Estimated data scan: {dry_run_job.total_bytes_processed / (1024**3):.2f} GB")
    print(f"Estimated cost: ${estimated_cost:.4f}")

    # Step 2: Check against threshold
    if estimated_cost > max_cost_dollars:
        raise ValueError(
            f"Query would cost ${estimated_cost:.2f}, "
            f"which exceeds the limit of ${max_cost_dollars:.2f}. "
            f"Query not executed."
        )

    # Step 3: Execute the query if within budget
    print("Cost within budget. Executing query...")
    query_job = client.query(query)
    results = query_job.result()

    # Report actual cost
    actual_tb = query_job.total_bytes_processed / (1024 ** 4)
    actual_cost = actual_tb * price_per_tb
    print(f"Actual cost: ${actual_cost:.4f}")

    return results


# Usage example
results = run_query_with_cost_check(
    "SELECT * FROM `my_project.analytics.events` WHERE DATE(timestamp) = '2026-02-15'",
    max_cost_dollars=5.0
)
```

## Understanding Why Estimates Vary

The dry run estimate is based on the metadata of the tables involved. There are several factors that affect accuracy.

Partition pruning works in dry runs. If your table is partitioned by date and your query filters on a specific date, the dry run estimate reflects only the partition that will be scanned, not the whole table. This is one of the biggest reasons partitioned tables save money.

Clustering effects are partially reflected. BigQuery may read less data than estimated when clustering allows it to skip irrelevant blocks, but the dry run estimate is typically conservative.

Query cache is not considered. If the query cache has results from an identical previous query, the actual execution might process zero bytes. But the dry run always estimates as if the cache does not exist.

Wildcard tables show estimates based on all matched tables, which is accurate.

## Integrating Dry Runs into CI/CD

A useful practice is running dry runs as part of your CI/CD pipeline to catch expensive queries before they reach production.

```python
# ci_cost_check.py - Run as part of your CI pipeline
import sys
import glob
from google.cloud import bigquery

# Cost threshold for CI checks
MAX_COST_PER_QUERY = 50.0  # dollars
PRICE_PER_TB = 6.25

client = bigquery.Client()

# Find all SQL files in the deployment
sql_files = glob.glob("queries/**/*.sql", recursive=True)
failures = []

for sql_file in sql_files:
    with open(sql_file, 'r') as f:
        query = f.read()

    try:
        # Run dry run for each query
        job_config = bigquery.QueryJobConfig(
            dry_run=True,
            use_query_cache=False
        )
        job = client.query(query, job_config=job_config)

        tb = job.total_bytes_processed / (1024 ** 4)
        cost = tb * PRICE_PER_TB

        if cost > MAX_COST_PER_QUERY:
            failures.append(f"{sql_file}: estimated cost ${cost:.2f} exceeds ${MAX_COST_PER_QUERY}")
            print(f"FAIL: {sql_file} - ${cost:.2f}")
        else:
            print(f"OK: {sql_file} - ${cost:.4f}")

    except Exception as e:
        failures.append(f"{sql_file}: {str(e)}")
        print(f"ERROR: {sql_file} - {str(e)}")

if failures:
    print(f"\n{len(failures)} queries exceeded cost threshold:")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
else:
    print("\nAll queries within cost limits.")
```

## Dry Run Limitations

There are a few things dry runs cannot tell you. They do not predict how long a query will take to run, only how much data will be scanned. They do not account for the query cache. They do not reflect slot-based pricing - if you are using reservations, you pay for slots, not bytes scanned, so the cost estimate is less relevant (though bytes processed still correlates with resource consumption). And they cannot estimate the cost of DML statements (INSERT, UPDATE, DELETE) accurately because those costs depend on the amount of data modified, not just read.

## Wrapping Up

Dry runs are one of the simplest and most effective cost management tools in BigQuery. Getting into the habit of checking query costs before execution - especially for ad-hoc queries on large tables - can save you from unexpected bills. For production workloads, building cost estimation into your CI/CD pipeline and query execution framework provides an automated safety net. It takes minimal effort to set up and the potential savings are significant.

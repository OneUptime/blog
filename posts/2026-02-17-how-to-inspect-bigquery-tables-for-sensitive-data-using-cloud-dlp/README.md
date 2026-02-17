# How to Inspect BigQuery Tables for Sensitive Data Using Cloud DLP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DLP, BigQuery, Data Security, Privacy

Description: A step-by-step guide to using Google Cloud DLP to scan BigQuery tables for sensitive data like PII, credit card numbers, and other confidential information.

---

BigQuery tables have a way of accumulating sensitive data that nobody expected. A developer dumps a CSV of customer records for analysis, a data pipeline ingests raw API responses with email addresses, or someone loads test data with real social security numbers. Before you know it, your analytics warehouse has PII scattered across dozens of tables.

Cloud DLP (Data Loss Prevention) can scan your BigQuery tables and tell you exactly what sensitive data lives where. In this post, I will walk through setting up inspection jobs that scan BigQuery for sensitive data and report back findings.

## What Cloud DLP Finds

Cloud DLP has over 150 built-in detectors (called InfoTypes) that recognize patterns like:

- Social security numbers, passport numbers, driver's license numbers
- Credit card numbers and bank account numbers
- Email addresses, phone numbers, physical addresses
- Names, dates of birth, ages
- API keys, passwords, authentication tokens
- Medical record numbers, health data

You can pick which InfoTypes to look for or let DLP use a broad set of detectors.

## Prerequisites

Make sure you have:

- Cloud DLP API enabled (`gcloud services enable dlp.googleapis.com`)
- BigQuery tables you want to scan
- The DLP Administrator role or equivalent permissions
- The BigQuery Data Viewer role on the tables to scan

## Step 1: Run a Quick Inspection with gcloud

The fastest way to start is with a simple `gcloud` command that inspects a specific BigQuery table:

```bash
# Inspect a BigQuery table for common sensitive data types
gcloud dlp datasources bigquery inspect \
  --project=PROJECT_ID \
  --dataset=my_dataset \
  --table=customer_records \
  --info-types="PHONE_NUMBER,EMAIL_ADDRESS,CREDIT_CARD_NUMBER,US_SOCIAL_SECURITY_NUMBER" \
  --max-findings=100
```

This runs a quick scan and returns up to 100 findings. It is useful for a spot check but not for comprehensive scanning.

## Step 2: Create an Inspection Job via the API

For a proper scan, you want to create a DLP inspection job. This gives you more control over what to scan, how deeply to scan, and where to send results.

Here is a JSON configuration for an inspection job:

```json
{
  "inspectJob": {
    "storageConfig": {
      "bigQueryOptions": {
        "tableReference": {
          "projectId": "my-project",
          "datasetId": "my_dataset",
          "tableId": "customer_records"
        },
        "sampleMethod": "RANDOM_START",
        "rowsLimit": 10000
      }
    },
    "inspectConfig": {
      "infoTypes": [
        {"name": "EMAIL_ADDRESS"},
        {"name": "PHONE_NUMBER"},
        {"name": "CREDIT_CARD_NUMBER"},
        {"name": "US_SOCIAL_SECURITY_NUMBER"},
        {"name": "PERSON_NAME"},
        {"name": "STREET_ADDRESS"},
        {"name": "DATE_OF_BIRTH"}
      ],
      "minLikelihood": "POSSIBLE",
      "limits": {
        "maxFindingsPerRequest": 1000,
        "maxFindingsPerItem": 100
      },
      "includeQuote": true
    },
    "actions": [
      {
        "saveFindings": {
          "outputConfig": {
            "table": {
              "projectId": "my-project",
              "datasetId": "dlp_results",
              "tableId": "customer_records_findings"
            }
          }
        }
      }
    ]
  }
}
```

Create the job:

```bash
# Create a DLP inspection job from the JSON configuration
curl -X POST \
  "https://dlp.googleapis.com/v2/projects/PROJECT_ID/dlpJobs" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @inspect-job.json
```

## Step 3: Using Python for More Flexibility

For programmatic scanning across multiple tables, Python is the way to go.

This script creates an inspection job and polls for results:

```python
from google.cloud import dlp_v2
import time

def inspect_bigquery_table(project_id, dataset_id, table_id, output_dataset):
    """Create a DLP inspection job for a BigQuery table."""

    # Initialize the DLP client
    dlp_client = dlp_v2.DlpServiceClient()

    # Define which sensitive data types to look for
    info_types = [
        {"name": "EMAIL_ADDRESS"},
        {"name": "PHONE_NUMBER"},
        {"name": "CREDIT_CARD_NUMBER"},
        {"name": "US_SOCIAL_SECURITY_NUMBER"},
        {"name": "PERSON_NAME"},
        {"name": "DATE_OF_BIRTH"},
        {"name": "STREET_ADDRESS"},
        {"name": "US_DRIVERS_LICENSE_NUMBER"},
    ]

    # Configure the inspection
    inspect_config = {
        "info_types": info_types,
        "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
        "limits": {
            "max_findings_per_request": 5000,
        },
        "include_quote": True,
    }

    # Point to the BigQuery table to scan
    storage_config = {
        "big_query_options": {
            "table_reference": {
                "project_id": project_id,
                "dataset_id": dataset_id,
                "table_id": table_id,
            },
            "rows_limit": 50000,
            "sample_method": "RANDOM_START",
        }
    }

    # Save findings to a BigQuery table for analysis
    actions = [
        {
            "save_findings": {
                "output_config": {
                    "table": {
                        "project_id": project_id,
                        "dataset_id": output_dataset,
                        "table_id": f"{table_id}_findings",
                    }
                }
            }
        }
    ]

    # Build and submit the job
    inspect_job = {
        "inspect_config": inspect_config,
        "storage_config": storage_config,
        "actions": actions,
    }

    parent = f"projects/{project_id}/locations/global"
    response = dlp_client.create_dlp_job(
        parent=parent,
        inspect_job=inspect_job,
    )

    print(f"Job created: {response.name}")

    # Poll for job completion
    while True:
        job = dlp_client.get_dlp_job(request={"name": response.name})
        if job.state == dlp_v2.DlpJob.JobState.DONE:
            break
        if job.state == dlp_v2.DlpJob.JobState.FAILED:
            print(f"Job failed: {job.errors}")
            return None
        print(f"Job state: {job.state.name}, waiting...")
        time.sleep(10)

    # Print the summary of findings
    result = job.inspect_details.result
    print(f"\nScan complete. Total findings: {result.processed_bytes} bytes processed")

    if result.info_type_stats:
        print("\nFindings by type:")
        for stat in result.info_type_stats:
            print(f"  {stat.info_type.name}: {stat.count}")

    return job

# Run the inspection
inspect_bigquery_table(
    project_id="my-project",
    dataset_id="my_dataset",
    table_id="customer_records",
    output_dataset="dlp_results"
)
```

## Step 4: Scan Multiple Tables

In a real environment, you want to scan all tables in a dataset or even across datasets. Here is how to iterate over tables:

```python
from google.cloud import bigquery, dlp_v2

def scan_all_tables_in_dataset(project_id, dataset_id, output_dataset):
    """Scan every table in a BigQuery dataset for sensitive data."""

    # List all tables in the dataset
    bq_client = bigquery.Client(project=project_id)
    tables = bq_client.list_tables(f"{project_id}.{dataset_id}")

    jobs = []
    for table in tables:
        print(f"Starting scan for {table.table_id}...")
        job = inspect_bigquery_table(
            project_id=project_id,
            dataset_id=dataset_id,
            table_id=table.table_id,
            output_dataset=output_dataset
        )
        if job:
            jobs.append(job)

    print(f"\nSubmitted {len(jobs)} inspection jobs")
    return jobs
```

## Step 5: Analyze the Results

Once the inspection jobs complete, findings are saved to the BigQuery output table. Query them to get a clear picture:

```sql
-- Find the most common types of sensitive data across all scanned tables
SELECT
  info_type.name AS info_type,
  COUNT(*) AS finding_count,
  COUNT(DISTINCT location.content_locations.record_location.table_location.row_id) AS affected_rows
FROM
  `my-project.dlp_results.customer_records_findings`
GROUP BY info_type.name
ORDER BY finding_count DESC;
```

```sql
-- Find which columns contain the most sensitive data
SELECT
  location.content_locations.record_location.field_id.name AS column_name,
  info_type.name AS info_type,
  COUNT(*) AS finding_count,
  likelihood AS confidence_level
FROM
  `my-project.dlp_results.customer_records_findings`
GROUP BY column_name, info_type, confidence_level
ORDER BY finding_count DESC;
```

## Step 6: Set Up Notifications

You probably want to know when a scan finds sensitive data without having to check manually. Add a Pub/Sub notification action to your job:

```json
{
  "actions": [
    {
      "saveFindings": {
        "outputConfig": {
          "table": {
            "projectId": "my-project",
            "datasetId": "dlp_results",
            "tableId": "findings"
          }
        }
      }
    },
    {
      "pubSub": {
        "topic": "projects/my-project/topics/dlp-findings"
      }
    }
  ]
}
```

Then set up a Cloud Function to process the notification and send alerts to Slack, email, or wherever your team pays attention.

## Sampling vs Full Scans

For large tables, scanning every row is expensive and slow. Cloud DLP supports sampling:

- `rowsLimit`: Scan only this many rows
- `sampleMethod`: `RANDOM_START` picks rows randomly, `TOP` starts from the beginning
- `rowsLimitPercent`: Scan a percentage of the table

For initial discovery, scanning 1-5% of a large table is usually enough to find out what types of sensitive data are present. Once you know which tables have issues, you can do targeted full scans on those.

## Cost Considerations

Cloud DLP charges per byte inspected. For BigQuery inspection specifically:

- The first 1 GB per month is free
- After that, pricing is per GB inspected
- Using sampling reduces costs significantly
- Restricting to specific columns (via `identifyingFields`) also reduces the data scanned

## Summary

Scanning BigQuery tables with Cloud DLP is straightforward once you understand the job configuration. Start with quick spot checks using `gcloud`, then build out automated scanning with the Python API. Save findings to a separate BigQuery dataset for analysis, set up notifications for new discoveries, and use sampling to keep costs manageable. The goal is to know exactly where sensitive data lives in your warehouse so you can take action to protect it.

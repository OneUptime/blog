# How to Set Up BigQuery Custom Cost Controls with Quotas and Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Cost Controls, Quotas, Alerts, Budget Management

Description: Learn how to implement custom cost controls in BigQuery using project quotas, per-user limits, budget alerts, and automated safeguards.

---

BigQuery on-demand pricing is convenient until someone accidentally runs a query that scans a petabyte of data. Without cost controls in place, a single poorly-written query can generate a bill that blows your entire monthly budget. Google Cloud provides several mechanisms for controlling BigQuery costs, from hard quotas that prevent queries from running to soft alerts that notify you when spending approaches a threshold.

In this post, I will walk through setting up comprehensive cost controls for BigQuery, covering project-level quotas, per-user limits, budget alerts, and automated enforcement.

## Setting Project-Level Query Quotas

The most direct way to limit BigQuery costs is setting a quota on the maximum bytes processed per day. When the quota is reached, additional queries are rejected until the next day.

```bash
# Set a project-level quota limiting daily query usage to 10 TB
gcloud services set-quota \
  --project=my-project \
  --consumer=projects/my-project \
  --service=bigquery.googleapis.com \
  --metric=bigquery.googleapis.com/quota/query/usage \
  --unit=1/d/project \
  --value=10995116277760  # 10 TB in bytes
```

You can also configure this through the Google Cloud Console by navigating to IAM and Admin, then Quotas, and searching for BigQuery. The relevant quotas include "Query usage per day" at the project level and "Query usage per day per user" for per-user limits.

## Per-User Query Limits

Project-level quotas protect the overall budget, but per-user limits prevent any single user from monopolizing the shared budget.

```bash
# Set a per-user daily query limit of 1 TB
gcloud services set-quota \
  --project=my-project \
  --consumer=projects/my-project \
  --service=bigquery.googleapis.com \
  --metric=bigquery.googleapis.com/quota/query/usage \
  --unit=1/d/project/user \
  --value=1099511627776  # 1 TB in bytes
```

When a user hits their daily limit, they will receive an error message explaining that their quota has been exceeded. This prevents a situation where one data analyst running expensive exploratory queries uses up the capacity that ETL pipelines need.

## Maximum Bytes Billed Per Query

You can set a maximum bytes billed at the individual query level. This acts as a safety net for specific queries or jobs.

```sql
-- Set a 100 GB maximum for this specific query
-- If the query would process more than 100 GB, it will fail instead of running
SELECT
  user_id,
  event_type,
  COUNT(*) as event_count
FROM
  `my_project.analytics.events`
WHERE
  DATE(timestamp) BETWEEN '2026-01-01' AND '2026-01-31'
GROUP BY
  user_id, event_type;
```

To apply this, use the query job configuration.

```python
from google.cloud import bigquery

client = bigquery.Client()

# Configure the query with a bytes limit
job_config = bigquery.QueryJobConfig(
    # Fail the query if it would process more than 100 GB
    maximum_bytes_billed=100 * 1024 ** 3  # 100 GB in bytes
)

query = """
SELECT user_id, event_type, COUNT(*) as event_count
FROM `my_project.analytics.events`
WHERE DATE(timestamp) BETWEEN '2026-01-01' AND '2026-01-31'
GROUP BY user_id, event_type
"""

try:
    results = client.query(query, job_config=job_config).result()
    for row in results:
        print(row)
except Exception as e:
    print(f"Query rejected: {e}")
```

For scheduled queries and pipeline jobs, always set maximum_bytes_billed to prevent unexpected data growth from causing cost spikes.

## Setting Up Budget Alerts

Google Cloud Billing budgets let you set spending thresholds and receive alerts when actual or forecasted spending approaches them.

```bash
# Create a budget with alerts at 50%, 80%, and 100% of $5,000/month
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="BigQuery Monthly Budget" \
  --budget-amount=5000USD \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.8 \
  --threshold-rule=percent=1.0 \
  --filter-projects="projects/my-project" \
  --filter-services="services/24E6-581D-38E5" \
  --notifications-pubsub-topic="projects/my-project/topics/billing-alerts"
```

The service ID "24E6-581D-38E5" corresponds to BigQuery. The Pub/Sub topic receives notifications when thresholds are crossed, which you can use to trigger automated responses.

## Automated Cost Enforcement with Cloud Functions

By connecting budget alerts to a Cloud Function through Pub/Sub, you can automatically take action when spending exceeds a threshold. For example, you could disable BigQuery API access for a project or restrict it to read-only.

```python
# Cloud Function triggered by budget alert Pub/Sub messages
import base64
import json
from google.cloud import bigquery_reservation_v1
from googleapiclient import discovery

def budget_alert_handler(event, context):
    """
    Triggered by a Pub/Sub message from a billing budget alert.
    Takes action when spending exceeds the budget.
    """
    # Decode the Pub/Sub message
    pubsub_data = base64.b64decode(event['data']).decode('utf-8')
    budget_notification = json.loads(pubsub_data)

    # Extract the cost information
    cost_amount = budget_notification.get('costAmount', 0)
    budget_amount = budget_notification.get('budgetAmount', 0)
    alert_threshold = budget_notification.get('alertThresholdExceeded', 0)

    print(f"Cost: ${cost_amount}, Budget: ${budget_amount}, "
          f"Threshold: {alert_threshold * 100}%")

    # Take action based on the threshold
    if alert_threshold >= 1.0:
        # Budget exceeded - restrict BigQuery access
        restrict_bigquery_access('my-project')
        send_alert_notification(
            f"BigQuery budget exceeded! "
            f"Cost: ${cost_amount}, Budget: ${budget_amount}"
        )
    elif alert_threshold >= 0.8:
        # Approaching budget - send warning
        send_alert_notification(
            f"BigQuery spending at {alert_threshold * 100}% of budget. "
            f"Cost: ${cost_amount}"
        )


def restrict_bigquery_access(project_id):
    """
    Restrict BigQuery access by reducing quotas when budget is exceeded.
    """
    # Use the Service Usage API to update quotas
    service = discovery.build('serviceusage', 'v1')

    # Reduce the daily query quota to a minimal value
    # This effectively stops new queries while allowing in-flight queries to complete
    print(f"Restricting BigQuery access for project {project_id}")
    # Implementation depends on your specific requirements


def send_alert_notification(message):
    """Send an alert to the team via Slack, email, etc."""
    print(f"ALERT: {message}")
    # Add your notification logic here
```

## Custom Quotas with Labels

BigQuery supports labels on jobs, which you can use to track and control costs by team, department, or purpose.

```python
from google.cloud import bigquery

client = bigquery.Client()

# Tag queries with labels for cost tracking
job_config = bigquery.QueryJobConfig(
    labels={
        "team": "data-engineering",
        "purpose": "etl-pipeline",
        "environment": "production"
    },
    maximum_bytes_billed=500 * 1024 ** 3  # 500 GB limit
)

query = "SELECT * FROM `my_project.analytics.events` WHERE DATE(timestamp) = '2026-02-15'"
results = client.query(query, job_config=job_config).result()
```

You can then analyze costs by label using INFORMATION_SCHEMA.

```sql
-- Cost breakdown by team label over the last 30 days
SELECT
  labels.value AS team,
  COUNT(*) AS query_count,
  ROUND(SUM(total_bytes_processed) / POW(1024, 4), 4) AS tb_processed,
  ROUND(SUM(total_bytes_processed) / POW(1024, 4) * 6.25, 2) AS estimated_cost
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS,
  UNNEST(labels) AS labels
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND labels.key = 'team'
  AND job_type = 'QUERY'
GROUP BY
  team
ORDER BY
  estimated_cost DESC;
```

## Requiring Partition Filters

One of the most effective cost controls is requiring partition filters on large tables. This prevents accidental full-table scans.

```sql
-- Alter existing table to require partition filters
ALTER TABLE `my_project.analytics.events`
SET OPTIONS(
  require_partition_filter = TRUE
);
```

After this, any query that does not include a filter on the partition column will fail with a clear error message, rather than scanning the entire table.

## Building a Cost Governance Dashboard

Pull all your cost control metrics together into a dashboard that leadership can review.

```sql
-- Monthly cost governance report
SELECT
  FORMAT_TIMESTAMP('%Y-%m', creation_time) AS month,
  project_id,
  COUNT(*) AS total_queries,
  -- Queries that were rejected by quotas
  COUNTIF(error_result.reason = 'quotaExceeded') AS quota_rejected_queries,
  -- Total data processed
  ROUND(SUM(total_bytes_processed) / POW(1024, 4), 4) AS tb_processed,
  -- Estimated cost
  ROUND(SUM(total_bytes_processed) / POW(1024, 4) * 6.25, 2) AS estimated_cost,
  -- Average cost per query
  ROUND(
    SUM(total_bytes_processed) / POW(1024, 4) * 6.25 / COUNT(*),
    4
  ) AS avg_cost_per_query
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
  AND job_type = 'QUERY'
GROUP BY
  month, project_id
ORDER BY
  month DESC, estimated_cost DESC;
```

## Wrapping Up

Effective cost control in BigQuery requires a layered approach. Project quotas provide a hard ceiling on spending. Per-user limits prevent any individual from exhausting the budget. Budget alerts give you early warning when spending is trending high. Automated enforcement through Cloud Functions provides a safety net for when human intervention is not fast enough. And requiring partition filters prevents the most common cause of unexpected costs - accidental full-table scans. Implement these controls before you need them, not after you get the surprise bill.

# How to Use Dataplex Auto Data Quality to Validate Data Without Writing Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataplex, Data Quality, Data Validation, BigQuery

Description: Learn how to use Dataplex Auto Data Quality to automatically validate your data with built-in rules, custom checks, and scheduled scans without writing any code.

---

Data quality issues are sneaky. They rarely cause loud errors. Instead, you get slightly wrong numbers in dashboards, ML models that drift, and analysts who stop trusting the data. Catching these issues early requires systematic validation, and that usually means writing a lot of custom SQL checks or building a framework from scratch.

Dataplex Auto Data Quality takes a different approach. You define rules in YAML, point them at your BigQuery tables, and Dataplex runs the checks on a schedule. No custom code, no framework to maintain, and the results integrate directly with Dataplex's data governance features.

I set this up to replace a homegrown data quality system that had grown to over 2,000 lines of Python. The YAML rules are much easier to maintain and the built-in recommendations catch issues that our custom checks missed.

## How Auto Data Quality Works

Dataplex Auto Data Quality works in two modes:

1. **Auto-suggest**: Dataplex analyzes your data and suggests quality rules based on column statistics and patterns. It might notice that a column is always non-null, or that values fall within a specific range.
2. **User-defined**: You write explicit rules in YAML that define what "good data" looks like for your tables.

Both modes generate scan results that show which rules passed or failed, with detailed metrics for investigation.

## Creating Your First Data Quality Scan

Start with a basic scan against a BigQuery table:

```yaml
# quality_rules/basic_orders_rules.yaml
rules:
  - nonNullExpectation: {}
    column: order_id
    dimension: COMPLETENESS
    threshold: 1.0
```

```bash
# Create a data quality scan for a BigQuery table

gcloud dataplex datascans create data-quality orders-quality-scan \
  --location=us-central1 \
  --data-source-entity="projects/my-project/locations/us-central1/lakes/analytics-lake/zones/curated-analytics/entities/orders" \
  --data-quality-spec-file="quality_rules/basic_orders_rules.yaml" \
  --display-name="Orders Table Quality Scan" \
  --description="Daily quality checks on the orders table"
```

Or directly reference a BigQuery table without a Dataplex entity:

```yaml
# quality_rules/basic_customer_rules.yaml
rules:
  - nonNullExpectation: {}
    column: customer_id
    dimension: COMPLETENESS
    threshold: 1.0
```

```bash
# Create a scan pointing directly to a BigQuery table
gcloud dataplex datascans create data-quality customer-quality-scan \
  --location=us-central1 \
  --data-source-resource="//bigquery.googleapis.com/projects/my-project/datasets/analytics/tables/customers" \
  --data-quality-spec-file="quality_rules/basic_customer_rules.yaml" \
  --display-name="Customer Table Quality Scan"
```

## Defining Quality Rules in YAML

Create a YAML file with your data quality rules:

```yaml
# quality_rules/orders_rules.yaml
# Data quality rules for the orders table
rules:
  # Completeness checks - ensure required fields are populated
  - nonNullExpectation: {}
    column: order_id
    dimension: COMPLETENESS
    description: "Order ID must never be null"
    threshold: 1.0

  - nonNullExpectation: {}
    column: customer_id
    dimension: COMPLETENESS
    description: "Customer ID must be present on every order"
    threshold: 1.0

  - nonNullExpectation: {}
    column: order_date
    dimension: COMPLETENESS
    description: "Order date is required"
    threshold: 1.0

  # Range checks - validate numeric values fall within expected bounds
  - rangeExpectation:
      minValue: "0.01"
      maxValue: "999999.99"
    column: total_amount
    dimension: VALIDITY
    description: "Order amount must be between $0.01 and $999,999.99"
    threshold: 0.99

  # Set membership - validate categorical values
  - setExpectation:
      values:
        - "pending"
        - "confirmed"
        - "shipped"
        - "delivered"
        - "cancelled"
        - "refunded"
    column: status
    dimension: VALIDITY
    description: "Order status must be a valid enum value"
    threshold: 1.0

  # Regex pattern matching - validate format
  - regexExpectation:
      regex: "^ORD-[0-9]{8,12}$"
    column: order_id
    dimension: VALIDITY
    description: "Order ID must follow the format ORD-XXXXXXXXXX"
    threshold: 1.0

  # Uniqueness check
  - uniquenessExpectation: {}
    column: order_id
    dimension: UNIQUENESS
    description: "Order IDs must be unique across the table"
    threshold: 1.0

  # Freshness check using a SQL expression
  - tableConditionExpectation:
      sqlExpression: "TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(TIMESTAMP(order_date)), HOUR) < 24"
    dimension: TIMELINESS
    description: "Table must have orders from the last 24 hours"

  # Volume check - make sure we have a reasonable number of rows
  - tableConditionExpectation:
      sqlExpression: "COUNT(*) > 1000"
    dimension: VOLUME
    description: "Table must have more than 1000 rows"

  # Cross-column validation
  - rowConditionExpectation:
      sqlExpression: "shipped_date IS NULL OR shipped_date >= order_date"
    dimension: CONSISTENCY
    description: "Shipped date must not be before order date"
    threshold: 1.0
```

Apply the rules to a scan:

```bash
# Create a data quality scan with the rules file
gcloud dataplex datascans create data-quality orders-quality-v2 \
  --location=us-central1 \
  --data-source-resource="//bigquery.googleapis.com/projects/my-project/datasets/analytics/tables/orders" \
  --display-name="Orders Quality Scan v2" \
  --data-quality-spec-file="quality_rules/orders_rules.yaml" \
  --on-demand=true
```

## Using Auto-Suggested Rules

Let Dataplex analyze your data and suggest rules:

```bash
# Run a profiling scan first to analyze the data
gcloud dataplex datascans create data-profile orders-profile \
  --location=us-central1 \
  --data-source-resource="//bigquery.googleapis.com/projects/my-project/datasets/analytics/tables/orders" \
  --display-name="Orders Data Profile" \
  --schedule="0 5 * * *"

# Run the profiling scan
gcloud dataplex datascans run orders-profile \
  --location=us-central1

# View the profiling results - these inform quality rule suggestions
gcloud dataplex datascans jobs list \
  --datascan=orders-profile \
  --location=us-central1
```

Dataplex uses the profiling results to suggest rules. You can review and adopt them with the data quality rule recommendation API:

```bash
# Generate suggested rules based on the latest successful profiling job
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://dataplex.googleapis.com/v1/projects/my-project/locations/us-central1/dataScans/orders-profile:generateDataQualityRules"
```

## Running Quality Scans

Trigger a scan manually or let the schedule handle it:

```bash
# Run a quality scan manually
gcloud dataplex datascans run orders-quality-v2 \
  --location=us-central1

# Check the scan job status
gcloud dataplex datascans jobs list \
  --datascan=orders-quality-v2 \
  --location=us-central1 \
  --format="table(name, state, startTime, endTime)"
```

## Viewing Scan Results

Get detailed results showing which rules passed and which failed:

```bash
# Get the latest scan job ID, then describe it
JOB_ID=$(gcloud dataplex datascans jobs list \
  --datascan=orders-quality-v2 \
  --location=us-central1 \
  --sort-by="~startTime" \
  --limit=1 \
  --format="value(name.basename())")

gcloud dataplex datascans jobs describe "$JOB_ID" \
  --datascan=orders-quality-v2 \
  --location=us-central1 \
  --format="yaml(dataQualityResult)"
```

For programmatic access to results:

```python
# check_quality_results.py
# Programmatically check data quality scan results
from google.cloud import dataplex_v1

def get_latest_scan_results(project_id, location, scan_id):
    """Get the latest data quality scan results."""
    client = dataplex_v1.DataScanServiceClient()

    scan_name = (
        f"projects/{project_id}/locations/{location}/dataScans/{scan_id}"
    )

    # List scan jobs and get the most recent successful one
    jobs = client.list_data_scan_jobs(
        request=dataplex_v1.ListDataScanJobsRequest(parent=scan_name)
    )
    succeeded_jobs = [
        job
        for job in jobs
        if job.state == dataplex_v1.DataScanJob.State.SUCCEEDED
    ]
    latest_job = max(succeeded_jobs, key=lambda job: job.start_time, default=None)

    if latest_job:
        # Get the full job details including results
        full_job = client.get_data_scan_job(
            request=dataplex_v1.GetDataScanJobRequest(
                name=latest_job.name
            )
        )

        result = full_job.data_quality_result
        print(f"Overall pass: {result.passed}")
        print(f"Score: {result.score}")
        print(f"Row count: {result.row_count}")

        for rule_result in result.rules:
            status = "PASS" if rule_result.passed else "FAIL"
            print(f"  [{status}] {rule_result.rule.description}")
            if not rule_result.passed:
                print(f"    Pass ratio: {rule_result.pass_ratio}")
                if rule_result.failing_rows_query:
                    print(f"    Failing rows query: {rule_result.failing_rows_query}")
                if rule_result.assertion_row_count:
                    print(f"    Assertion row count: {rule_result.assertion_row_count}")

        return result

    print("No completed scan jobs found")
    return None

get_latest_scan_results("my-project", "us-central1", "orders-quality-v2")
```

## Scheduling Regular Scans

Set up automated quality checks that run on a schedule:

```bash
# Update the scan to run daily at 6 AM
gcloud dataplex datascans update data-quality orders-quality-v2 \
  --location=us-central1 \
  --schedule="0 6 * * *"
```

## Alerting on Quality Failures

Combine quality scan results with Cloud Logging and Cloud Monitoring alerts. In Logs Explorer, create a log-based alert with a query like this:

```text
resource.type="dataplex.googleapis.com/DataScan"
AND labels."dataplex.googleapis.com/data_scan_state"="SUCCEEDED"
AND resource.labels.resource_container="projects/123456789012"
AND resource.labels.datascan_id="orders-quality-v2"
AND NOT jsonPayload.dataQuality.passed=true
```

For a dimension-level alert, filter on a specific dimension result:

```text
resource.type="dataplex.googleapis.com/DataScan"
AND labels."dataplex.googleapis.com/data_scan_state"="SUCCEEDED"
AND resource.labels.resource_container="projects/123456789012"
AND resource.labels.datascan_id="orders-quality-v2"
AND jsonPayload.dataQuality.dimensionPassed.UNIQUENESS=false
```

## Advanced Rule Patterns

More complex rules using SQL expressions:

```yaml
# quality_rules/advanced_rules.yaml
rules:
  # Statistical outlier detection
  - sqlAssertion:
      sqlStatement: |
        WITH stats AS (
          SELECT AVG(total_amount) AS avg_val, STDDEV(total_amount) AS std_val
          FROM ${data()}
        )
        SELECT *
        FROM ${data()}, stats
        WHERE total_amount > avg_val + 4 * std_val
    dimension: VALIDITY
    description: "No extreme statistical outliers in order amounts (4 sigma)"

  # Referential integrity check
  - sqlAssertion:
      sqlStatement: |
        SELECT d.*
        FROM ${data()} d
        LEFT JOIN `my-project.analytics.customers` c
          ON d.customer_id = c.customer_id
        WHERE c.customer_id IS NULL
    dimension: CONSISTENCY
    description: "All customer IDs must exist in the customers table"

  # Partition completeness check
  - sqlAssertion:
      sqlStatement: |
        WITH expected_dates AS (
          SELECT day
          FROM UNNEST(GENERATE_DATE_ARRAY(DATE('2026-01-01'), CURRENT_DATE())) AS day
        ),
        actual_dates AS (
          SELECT DISTINCT DATE(order_date) AS day
          FROM ${data()}
          WHERE DATE(order_date) >= DATE('2026-01-01')
        )
        SELECT e.day
        FROM expected_dates e
        LEFT JOIN actual_dates a USING (day)
        WHERE a.day IS NULL
    dimension: COMPLETENESS
    description: "Every day since Jan 1 2026 must have at least one order"
```

## Summary

Dataplex Auto Data Quality lets you validate your data systematically without writing code. Define rules in YAML covering completeness, validity, uniqueness, freshness, and consistency. Use profiling scans to discover data characteristics and auto-suggest rules. Schedule scans to run regularly and integrate with Cloud Monitoring for alerts when quality degrades. The YAML-based approach makes rules easy to version control, review in pull requests, and maintain as your data evolves. For teams that need data quality checks but do not want to build and maintain a custom framework, Dataplex Auto Data Quality provides a solid managed alternative.

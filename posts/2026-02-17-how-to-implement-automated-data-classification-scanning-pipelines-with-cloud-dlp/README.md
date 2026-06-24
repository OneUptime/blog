# How to Implement Automated Data Classification Scanning Pipelines with Cloud DLP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DLP, Data Classification, Data Security, Sensitive Data

Description: Build automated data classification pipelines using Google Cloud DLP to scan, classify, and tag sensitive data across BigQuery, Cloud Storage, and Datastore.

---

Most organizations know they have sensitive data somewhere in their cloud environment. The problem is knowing exactly where. PII sitting in a BigQuery table that someone exported from a production database, credit card numbers in log files, medical records in a Cloud Storage bucket that was supposed to be temporary - these things happen. Cloud DLP (Data Loss Prevention) gives you the tools to find this data automatically, but building a scanning pipeline that runs continuously and acts on the results takes some thought.

This guide walks through building an end-to-end data classification pipeline that scans your GCP resources on a schedule, tags what it finds, and alerts you when sensitive data shows up where it shouldn't be.

## Pipeline Architecture

```mermaid
graph TB
    A[Cloud Scheduler] --> B[Cloud Function: Orchestrator]
    B --> C[Cloud DLP API]
    C --> D[Scan BigQuery Tables]
    C --> E[Scan GCS Buckets]
    D --> G[DLP Job Results]
    E --> G
    G --> H[Cloud Function: Processor]
    H --> I[Resource Labels]
    H --> J[BigQuery Findings]
    H --> K[Pub/Sub Alerts]
    K --> L[Slack / Email / PagerDuty]
```

## Defining InfoTypes to Scan For

Cloud DLP has built-in detectors for common sensitive data types. Start with the ones most relevant to your compliance requirements:

```python
# dlp_config.py - Central configuration for DLP scanning

# InfoTypes to scan for, grouped by sensitivity level

INFOTYPE_CONFIG = {
    "critical": [
        {"name": "CREDIT_CARD_NUMBER"},
        {"name": "US_SOCIAL_SECURITY_NUMBER"},
        {"name": "US_BANK_ROUTING_MICR"},
        {"name": "IBAN_CODE"},
    ],
    "high": [
        {"name": "EMAIL_ADDRESS"},
        {"name": "PHONE_NUMBER"},
        {"name": "PERSON_NAME"},
        {"name": "STREET_ADDRESS"},
        {"name": "DATE_OF_BIRTH"},
    ],
    "medium": [
        {"name": "IP_ADDRESS"},
        {"name": "MAC_ADDRESS"},
        {"name": "URL"},
        {"name": "DOMAIN_NAME"},
    ]
}

# Combine all info types into a flat list for scanning
def get_all_infotypes():
    """Return all configured info types as a flat list"""
    all_types = []
    for level in INFOTYPE_CONFIG.values():
        all_types.extend(level)
    return all_types

# Map info type names to severity levels for alerting
def get_severity(infotype_name):
    """Look up the severity level for a given info type"""
    for level, types in INFOTYPE_CONFIG.items():
        if any(t["name"] == infotype_name for t in types):
            return level
    return "unknown"
```

## Building the Orchestrator Function

The orchestrator discovers resources to scan and kicks off DLP inspection jobs:

```python
import google.cloud.dlp_v2 as dlp
from google.cloud import bigquery
from google.cloud import storage
from dlp_config import get_all_infotypes

def orchestrate_scan(event, context):
    """Discover resources and create DLP inspection jobs"""
    dlp_client = dlp.DlpServiceClient()
    project_id = "your-project-id"
    parent = f"projects/{project_id}/locations/global"

    # Configure the inspection settings
    inspect_config = dlp.InspectConfig(
        info_types=get_all_infotypes(),
        # Set minimum likelihood to reduce false positives
        min_likelihood=dlp.Likelihood.LIKELY,
        # Cap returned findings to keep job output manageable
        limits=dlp.InspectConfig.FindingLimits(
            max_findings_per_item=100,
            max_findings_per_request=1000,
        ),
        # Include the matched content snippet for review
        include_quote=True,
    )

    # Scan all BigQuery datasets
    scan_bigquery_datasets(dlp_client, parent, project_id, inspect_config)

    # Scan targeted GCS buckets
    scan_gcs_buckets(dlp_client, parent, project_id, inspect_config)

def scan_bigquery_datasets(dlp_client, parent, project_id, inspect_config):
    """Create DLP jobs for each BigQuery table"""
    bq_client = bigquery.Client(project=project_id)

    for dataset in bq_client.list_datasets():
        dataset_id = dataset.dataset_id

        # Skip known non-sensitive datasets to save on API costs
        if dataset_id.startswith("staging_") or dataset_id == "dlp_results":
            continue

        for table_item in bq_client.list_tables(dataset.reference):
            table = bq_client.get_table(table_item.reference)
            if table.table_type != "TABLE":
                continue

            # Configure the BigQuery scanning job
            storage_config = dlp.StorageConfig(
                big_query_options=dlp.BigQueryOptions(
                    table_reference=dlp.BigQueryTable(
                        project_id=project_id,
                        dataset_id=dataset_id,
                        table_id=table.table_id,
                    ),
                    # Sample a percentage of rows for large tables
                    rows_limit_percent=10,
                    sample_method=dlp.BigQueryOptions.SampleMethod.RANDOM_START,
                ),
            )

            # Set up actions to perform when findings are detected
            actions = [
                dlp.Action(
                    pub_sub=dlp.Action.PublishToPubSub(
                        topic=f"projects/{project_id}/topics/dlp-findings"
                    )
                ),
                dlp.Action(
                    save_findings=dlp.Action.SaveFindings(
                        output_config=dlp.OutputStorageConfig(
                            table=dlp.BigQueryTable(
                                project_id=project_id,
                                dataset_id="dlp_results",
                                table_id="findings",
                            )
                        )
                    )
                ),
            ]

            # Create the DLP inspection job
            job = dlp_client.create_dlp_job(
                request={
                    "parent": parent,
                    "inspect_job": dlp.InspectJobConfig(
                        inspect_config=inspect_config,
                        storage_config=storage_config,
                        actions=actions,
                    ),
                }
            )
            print(f"Started DLP job for {dataset_id}.{table.table_id}: {job.name}")
```

## Scanning Cloud Storage Buckets

For GCS, you can target specific buckets or scan everything:

```python
from datetime import datetime, timedelta, timezone

def scan_gcs_buckets(dlp_client, parent, project_id, inspect_config):
    """Create DLP scan jobs for Cloud Storage buckets"""
    storage_client = storage.Client(project=project_id)

    for bucket in storage_client.list_buckets():
        # Skip buckets that are already classified
        labels = bucket.labels or {}
        if labels.get("dlp_scanned") == "true":
            last_scan = labels.get("dlp_last_scan", "")
            # Only rescan if it's been more than 7 days
            if _recently_scanned(last_scan, days=7):
                continue

        storage_config = dlp.StorageConfig(
            cloud_storage_options=dlp.CloudStorageOptions(
                file_set=dlp.CloudStorageOptions.FileSet(
                    url=f"gs://{bucket.name}/**"
                ),
                # Only scan text-based files
                file_types=[
                    dlp.FileType.TEXT_FILE,
                    dlp.FileType.PDF,
                ],
                # Limit bytes scanned per file to control costs
                bytes_limit_per_file=1048576,  # 1 MB per file
                # Sample files rather than scanning everything
                files_limit_percent=25,
            ),
        )

        actions = [
            dlp.Action(
                pub_sub=dlp.Action.PublishToPubSub(
                    topic=f"projects/{project_id}/topics/dlp-findings"
                )
            ),
            dlp.Action(
                save_findings=dlp.Action.SaveFindings(
                    output_config=dlp.OutputStorageConfig(
                        table=dlp.BigQueryTable(
                            project_id=project_id,
                            dataset_id="dlp_results",
                            table_id="findings",
                        )
                    )
                )
            ),
        ]

        job = dlp_client.create_dlp_job(
            request={
                "parent": parent,
                "inspect_job": dlp.InspectJobConfig(
                    inspect_config=inspect_config,
                    storage_config=storage_config,
                    actions=actions,
                ),
            }
        )
        print(f"Started DLP job for bucket {bucket.name}: {job.name}")

def _recently_scanned(last_scan, days):
    """Check if a YYYY-MM-DD label value is within the rescan window"""
    if not last_scan:
        return False
    scan_date = datetime.strptime(last_scan, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - scan_date < timedelta(days=days)
```

## Processing Scan Results

When a DLP job completes, the Pub/Sub action publishes the completed DLP job name. The processor function fetches the job summary, applies classification labels, and handles alerting:

```python
import base64
import json
from datetime import datetime, timedelta, timezone
from google.cloud import bigquery
from google.cloud import dlp_v2 as dlp
from google.cloud import storage
from dlp_config import get_severity

PROJECT_ID = "your-project-id"

def process_dlp_findings(event, context):
    """Process completed DLP job findings"""
    message = base64.b64decode(event["data"]).decode("utf-8")
    finding_data = json.loads(message)
    job_name = finding_data["DlpJobName"]

    dlp_client = dlp.DlpServiceClient()
    job = dlp_client.get_dlp_job(request={"name": job_name})
    resource_name = get_job_resource_name(job)

    detected = []
    for stat in job.inspect_details.result.info_type_stats:
        infotype = stat.info_type.name
        detected.append((infotype, stat.count, get_severity(infotype)))

    if not detected:
        return

    highest_severity = max(
        (severity for _, _, severity in detected),
        key=lambda severity: {"unknown": 0, "medium": 1, "high": 2, "critical": 3}[severity],
    )
    infotypes = sorted({infotype for infotype, _, _ in detected})

    # Tag the resource with labels
    label_classification(resource_name, highest_severity, infotypes)

    # Alert on critical and high severity findings
    if highest_severity in ("critical", "high"):
        send_finding_alert(resource_name, detected)

def get_job_resource_name(job):
    """Return a label-friendly source identifier from the DLP job config"""
    storage_config = job.inspect_details.requested_options.job_config.storage_config
    table_ref = storage_config.big_query_options.table_reference
    if table_ref.project_id:
        return (
            f"bigquery://projects/{table_ref.project_id}/datasets/"
            f"{table_ref.dataset_id}/tables/{table_ref.table_id}"
        )
    return storage_config.cloud_storage_options.file_set.url

def label_classification(resource_name, severity, infotypes):
    """Apply classification labels to the scanned BigQuery table or bucket"""
    labels = {
        "dlp_scanned": "true",
        "dlp_sensitivity": severity,
        "dlp_last_scan": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "dlp_infotypes": "-".join(infotypes[:3]).lower().replace("_", "-")[:63],
    }

    if resource_name.startswith("bigquery://"):
        parts = resource_name.removeprefix("bigquery://projects/").split("/")
        project_id, dataset_id, table_id = parts[0], parts[2], parts[4]
        client = bigquery.Client(project=project_id)
        table = client.get_table(f"{project_id}.{dataset_id}.{table_id}")
        table.labels = {**(table.labels or {}), **labels}
        client.update_table(table, ["labels"])
        return

    if resource_name.startswith("gs://"):
        bucket_name = resource_name.removeprefix("gs://").split("/", 1)[0]
        bucket = storage.Client(project=PROJECT_ID).bucket(bucket_name)
        bucket.reload()
        bucket.labels = {**(bucket.labels or {}), **labels}
        bucket.patch()

def send_finding_alert(resource_name, detected):
    """Send an alert to your preferred channel"""
    summary = ", ".join(
        f"{infotype}={count}" for infotype, count, _ in detected
    )
    print(f"Sensitive data found in {resource_name}: {summary}")
```

## Setting Up the Schedule

Deploy everything and configure the scanning schedule:

```bash
# Create the Pub/Sub topic for DLP findings
gcloud pubsub topics create dlp-findings
gcloud pubsub topics create dlp-scan-trigger

# Create the BigQuery dataset for storing results
bq mk --dataset dlp_results

# Deploy the orchestrator function
gcloud functions deploy dlp-orchestrator \
    --runtime python311 \
    --entry-point orchestrate_scan \
    --trigger-topic dlp-scan-trigger \
    --timeout 540 \
    --memory 1GB

# Deploy the findings processor
gcloud functions deploy dlp-processor \
    --runtime python311 \
    --entry-point process_dlp_findings \
    --trigger-topic dlp-findings \
    --timeout 120

# Schedule weekly scans
gcloud scheduler jobs create pubsub dlp-weekly-scan \
    --schedule "0 2 * * 0" \
    --topic dlp-scan-trigger \
    --message-body '{"scan_type": "full"}'
```

## Querying Historical Findings

With results stored in BigQuery, you can track classification status over time:

```sql
-- Find the most common types of sensitive data in your org
SELECT
    info_type.name AS infotype,
    COUNT(*) AS finding_count,
    COUNT(DISTINCT resource_name) AS affected_resources
FROM `your-project.dlp_results.findings`
WHERE TIMESTAMP_SECONDS(create_time.seconds) > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY infotype
ORDER BY finding_count DESC

-- Find resources with critical sensitive data
SELECT
    resource_name,
    ARRAY_AGG(DISTINCT info_type.name) AS detected_types,
    COUNT(*) AS finding_count
FROM `your-project.dlp_results.findings`
WHERE info_type.name IN ('CREDIT_CARD_NUMBER', 'US_SOCIAL_SECURITY_NUMBER')
GROUP BY resource_name
```

## Wrapping Up

Automated data classification with Cloud DLP moves you from "we think we know where our sensitive data is" to "we know exactly where it is." The pipeline approach - discover, scan, classify, alert - gives you continuous visibility rather than point-in-time snapshots. Start with your most critical data types (PII, financial data), scan your highest-risk storage locations first, and expand coverage over time. The cost of DLP scanning is real, so use sampling and targeted scanning to keep it manageable while still maintaining good coverage.

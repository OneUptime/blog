# How to Export Healthcare Data from FHIR Stores to BigQuery for Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Healthcare API, FHIR, BigQuery, Data Export, Analytics, Google Cloud

Description: Export FHIR healthcare data from Google Cloud Healthcare API to BigQuery for running analytics queries on clinical data at scale.

---

Storing clinical data in FHIR format is great for interoperability, but when your analytics team needs to run queries across millions of patient records, a FHIR API with search parameters is not going to cut it. You need the data in a SQL-friendly warehouse. Google Cloud Healthcare API has a built-in export feature that sends FHIR store contents directly to BigQuery, flattening the nested FHIR resource structure into queryable tables.

In this post, I will walk through the full process of exporting FHIR data to BigQuery, configuring the schema mappings, handling incremental exports, and writing useful analytics queries against the exported data.

## Why Export to BigQuery

FHIR stores are optimized for clinical operations - reading individual patient records, searching by specific criteria, and maintaining referential integrity. BigQuery is optimized for analytics - scanning billions of rows, joining across multiple tables, and running aggregations. The combination gives you the best of both worlds.

Typical use cases for exported FHIR data in BigQuery:

- Population health dashboards
- Clinical quality measure reporting
- Operational analytics (ED wait times, bed utilization)
- Cohort identification for clinical trials
- Longitudinal patient outcome analysis

## Prerequisites

Make sure you have:

- A FHIR store with data in Google Cloud Healthcare API
- A BigQuery dataset in the same project (or with appropriate cross-project permissions)
- The `healthcare.fhirStores.export` IAM permission
- The Healthcare API service account needs `bigquery.dataEditor` role on the target dataset

## Step 1: Create the BigQuery Dataset

The target BigQuery dataset needs to exist before you can export. Make sure it is in the same region as your Healthcare API dataset.

This command creates the dataset in the matching region:

```bash
# Create BigQuery dataset in the same region as your FHIR store
bq mk --dataset \
  --location=us-central1 \
  --description="Exported FHIR data for healthcare analytics" \
  MY_PROJECT:fhir_analytics
```

## Step 2: Grant BigQuery Access to Healthcare API

The Healthcare API service agent needs permission to write to BigQuery. This is the Google-managed service account, not your personal one.

This grants the necessary BigQuery role to the Healthcare API service agent:

```bash
# Get the Healthcare API service agent email
# Format: service-PROJECT_NUMBER@gcp-sa-healthcare.iam.gserviceaccount.com

# Grant BigQuery Data Editor role to the Healthcare API service agent
gcloud projects add-iam-policy-binding MY_PROJECT \
  --member="serviceAccount:service-PROJECT_NUMBER@gcp-sa-healthcare.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

# Also grant BigQuery Job User for running export jobs
gcloud projects add-iam-policy-binding MY_PROJECT \
  --member="serviceAccount:service-PROJECT_NUMBER@gcp-sa-healthcare.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```

## Step 3: Run the Initial Export

The export operation copies all FHIR resources into BigQuery tables. Each FHIR resource type gets its own table (Patient, Observation, Condition, etc.).

This command triggers the export using the REST API:

```bash
# Export FHIR store contents to BigQuery
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://healthcare.googleapis.com/v1/projects/MY_PROJECT/locations/us-central1/datasets/my-dataset/fhirStores/my-fhir-store:export" \
  -d '{
    "bigqueryDestination": {
      "datasetUri": "bq://MY_PROJECT.fhir_analytics",
      "schemaConfig": {
        "schemaType": "ANALYTICS_V2",
        "recursiveStructureDepth": 3
      },
      "writeDisposition": "WRITE_TRUNCATE"
    }
  }'
```

You can also use the Python client for better error handling:

```python
from google.cloud import healthcare_v1

def export_fhir_to_bigquery(project_id, location, dataset_id, fhir_store_id, bq_dataset):
    """Exports a FHIR store to BigQuery."""
    client = healthcare_v1.FhirServiceClient()

    # Build the FHIR store name
    fhir_store_name = (
        f"projects/{project_id}/locations/{location}"
        f"/datasets/{dataset_id}/fhirStores/{fhir_store_id}"
    )

    # Configure the BigQuery export destination
    request = healthcare_v1.ExportResourcesRequest(
        name=fhir_store_name,
        bigquery_destination=healthcare_v1.BigQueryDestination(
            dataset_uri=f"bq://{project_id}.{bq_dataset}",
            schema_config=healthcare_v1.SchemaConfig(
                schema_type=healthcare_v1.SchemaConfig.SchemaType.ANALYTICS_V2,
                recursive_structure_depth=3,
            ),
            write_disposition=healthcare_v1.BigQueryDestination.WriteDisposition.WRITE_TRUNCATE,
        ),
    )

    # Execute the export and wait for completion
    operation = client.export_resources(request=request)
    print("Export in progress...")
    result = operation.result(timeout=1800)
    print(f"Export complete: {result}")
    return result

export_fhir_to_bigquery(
    "my-project", "us-central1", "my-dataset", "my-fhir-store", "fhir_analytics"
)
```

## Understanding the Schema Types

The `schemaType` option determines how FHIR resources map to BigQuery columns:

- **ANALYTICS** - original analytics schema, flattens resources into columns
- **ANALYTICS_V2** - improved schema with better handling of nested structures, repeated fields, and extensions. This is the recommended option.

The `recursiveStructureDepth` controls how deeply nested structures are expanded. A value of 3 means structures nested more than 3 levels deep will be stored as JSON strings rather than individual columns.

## Step 4: Explore the Exported Tables

After the export completes, you will find tables in BigQuery for each resource type present in your FHIR store.

This query lists all the tables that were created:

```sql
-- List all tables created by the FHIR export
SELECT table_name, row_count, size_bytes
FROM `MY_PROJECT.fhir_analytics.INFORMATION_SCHEMA.TABLES`
ORDER BY row_count DESC;
```

## Step 5: Write Analytics Queries

Now for the fun part. Here are some practical queries against the exported data.

This query calculates the average number of observations per patient:

```sql
-- Average observations per patient
SELECT
  AVG(obs_count) as avg_observations,
  MIN(obs_count) as min_observations,
  MAX(obs_count) as max_observations
FROM (
  SELECT
    subject.patientId as patient_id,
    COUNT(*) as obs_count
  FROM `MY_PROJECT.fhir_analytics.Observation`
  GROUP BY patient_id
);
```

This query finds the most common conditions in the patient population:

```sql
-- Top 20 most common conditions
SELECT
  code.coding[SAFE_OFFSET(0)].code as condition_code,
  code.coding[SAFE_OFFSET(0)].display as condition_name,
  COUNT(DISTINCT subject.patientId) as patient_count
FROM `MY_PROJECT.fhir_analytics.Condition`
GROUP BY condition_code, condition_name
ORDER BY patient_count DESC
LIMIT 20;
```

This query identifies patients with abnormal lab values:

```sql
-- Patients with critical lab values in the last 30 days
SELECT
  subject.patientId as patient_id,
  code.coding[SAFE_OFFSET(0)].display as test_name,
  value.quantity.value as result_value,
  value.quantity.unit as result_unit,
  interpretation[SAFE_OFFSET(0)].coding[SAFE_OFFSET(0)].code as interpretation_code
FROM `MY_PROJECT.fhir_analytics.Observation`
WHERE
  TIMESTAMP(meta.lastUpdated) > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND interpretation[SAFE_OFFSET(0)].coding[SAFE_OFFSET(0)].code IN ('H', 'HH', 'L', 'LL')
ORDER BY meta.lastUpdated DESC;
```

## Step 6: Set Up Incremental Exports

For production, you do not want to re-export the entire FHIR store every time. Set up a scheduled incremental export using Cloud Scheduler and a Cloud Function.

This Cloud Function handles incremental exports based on the last export timestamp:

```python
from google.cloud import healthcare_v1
import functions_framework
from datetime import datetime, timedelta

@functions_framework.http
def incremental_export(request):
    """Runs an incremental FHIR to BigQuery export."""
    client = healthcare_v1.FhirServiceClient()

    fhir_store_name = (
        "projects/MY_PROJECT/locations/us-central1"
        "/datasets/my-dataset/fhirStores/my-fhir-store"
    )

    # Use WRITE_APPEND to add new/updated records without overwriting
    request = healthcare_v1.ExportResourcesRequest(
        name=fhir_store_name,
        bigquery_destination=healthcare_v1.BigQueryDestination(
            dataset_uri="bq://MY_PROJECT.fhir_analytics",
            schema_config=healthcare_v1.SchemaConfig(
                schema_type=healthcare_v1.SchemaConfig.SchemaType.ANALYTICS_V2,
                recursive_structure_depth=3,
            ),
            # WRITE_APPEND adds to existing tables
            write_disposition=healthcare_v1.BigQueryDestination.WriteDisposition.WRITE_APPEND,
        ),
        _since=datetime.utcnow() - timedelta(hours=24),
    )

    operation = client.export_resources(request=request)
    operation.result(timeout=1800)

    return "Incremental export complete", 200
```

Schedule it to run daily:

```bash
# Schedule daily incremental exports at 2 AM UTC
gcloud scheduler jobs create http fhir-daily-export \
  --schedule="0 2 * * *" \
  --uri="https://us-central1-MY_PROJECT.cloudfunctions.net/incremental-export" \
  --http-method=POST \
  --oidc-service-account-email=scheduler@MY_PROJECT.iam.gserviceaccount.com
```

## Summary

Exporting FHIR data to BigQuery bridges the gap between clinical data management and analytics. The Healthcare API handles the schema transformation automatically, converting nested FHIR resources into flat BigQuery tables. Use ANALYTICS_V2 for the best schema mapping, set up incremental exports for production, and take advantage of BigQuery's SQL capabilities to run the kind of population-level queries that would be impractical against a FHIR API directly. The combination of FHIR for clinical operations and BigQuery for analytics gives healthcare organizations a modern, scalable data platform.

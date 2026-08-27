# How to Fix BigQuery `Cannot Read and Write in Different Locations` for External Cloud Storage Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, BigQuery, Cloud Storage, External Tables, Data Location

Description: Align a Cloud Storage bucket, BigQuery external-table dataset, query job, and destination dataset to resolve cross-location write failures.

---

A BigQuery external table stores its definition in a BigQuery dataset while its data remains in Cloud Storage. A query that reads that table and writes results therefore involves at least four location-sensitive components:

1. The Cloud Storage bucket.
2. The BigQuery dataset containing the external table definition.
3. The BigQuery query job.
4. The BigQuery dataset containing the destination table.

In a standard, non-global query, the source and destination datasets must match the query job's location. Keep the Cloud Storage bucket in a location documented as colocated with the dataset that contains the external table; a non-colocated read can incur data transfer charges. A mismatch between the query job, source dataset, and destination dataset leads to errors such as `Cannot read and write in different locations`.

## Inventory every location first

Use fully qualified resource names so the active CLI project cannot hide a project mismatch:

```bash
SOURCE_PROJECT_ID='example-source-project'
SOURCE_DATASET='external_data'
DESTINATION_PROJECT_ID='example-analytics-project'
DESTINATION_DATASET='curated_data'
BUCKET='example-source-bucket'
EXTERNAL_TABLE='events'

bq show --format=prettyjson \
  "${SOURCE_PROJECT_ID}:${SOURCE_DATASET}"

bq show --format=prettyjson \
  "${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}"

gcloud storage buckets describe "gs://${BUCKET}" \
  --format='yaml(name,location)'
```

Read the `location` field from each dataset and the bucket. Do not infer a dataset's location from its project, reservation, or name. One project can contain datasets in several locations.

Also inspect the external table definition to confirm its Cloud Storage URI:

```bash
bq show --format=prettyjson \
  "${SOURCE_PROJECT_ID}:${SOURCE_DATASET}.${EXTERNAL_TABLE}"
```

## Understand Cloud Storage colocation

For Cloud Storage external tables, BigQuery's guidance defines specific colocated locations. They are more specific than simply being on the same continent.

For example:

- A bucket in `us-central1` can be used by an external table dataset in `us-central1` or the `US` multi-region.
- A bucket in `europe-west1` can be used by a dataset in `europe-west1` or the `EU` multi-region.
- A `US` dataset can use a `US` bucket, a `us-central1` bucket, or a supported dual-region that includes `us-central1`.

Consult the current location table for dual-regions and configurable dual-regions. Do not assume that every US single region is colocated with the `US` multi-region, or that every EU single region is colocated with `EU`.

Colocation of the bucket and external table does not make `US` and `us-central1` the same BigQuery dataset location. If a query reads a table in `US` and writes to a dataset in `us-central1`, that query crosses BigQuery locations.

## Use one BigQuery location for the durable fix

For the simplest production design, place the external table and destination dataset in the same BigQuery location, with a bucket compatible with that location.

Suppose the bucket is in `us-central1`. Choose new dataset IDs, because existing dataset locations cannot be changed, and create both BigQuery datasets in `us-central1`:

```bash
DATA_LOCATION='us-central1'
ALIGNED_SOURCE_DATASET='external_data_us_central1'
ALIGNED_DESTINATION_DATASET='curated_data_us_central1'

bq --location="${DATA_LOCATION}" mk \
  --dataset \
  "${SOURCE_PROJECT_ID}:${ALIGNED_SOURCE_DATASET}"

bq --location="${DATA_LOCATION}" mk \
  --dataset \
  "${DESTINATION_PROJECT_ID}:${ALIGNED_DESTINATION_DATASET}"
```

Dataset locations are fixed at creation time. If an existing dataset is in the wrong location, create a new dataset in the intended location and copy or recreate its resources using a supported migration method.

Create or recreate the external table in the matched source dataset:

```sql
CREATE OR REPLACE EXTERNAL TABLE
  `example-source-project.external_data_us_central1.events`
OPTIONS (
  format = 'PARQUET',
  uris = ['gs://example-source-bucket/events/*.parquet']
);
```

Run the query with an explicit job location and a destination in that location:

```bash
bq --location="${DATA_LOCATION}" query \
  --use_legacy_sql=false \
  --replace=true \
  --destination_table="${DESTINATION_PROJECT_ID}:${ALIGNED_DESTINATION_DATASET}.daily_events" \
  'SELECT * FROM `example-source-project.external_data_us_central1.events`'
```

Explicit `--location` prevents a query with no statically identifiable resource location, including a dynamically generated query, from falling back to an unintended default. The SQL must still reference only resources permitted by that execution mode and location.

## Move the right side of the boundary

If the existing dataset location is mandatory, use a Cloud Storage location documented as colocated with that dataset. If the bucket location is mandatory, create the external-table and destination datasets in one BigQuery location documented as colocated with the bucket.

Moving data can incur retrieval, transfer, storage, and query costs. Cloud Storage supports documented bucket relocation and object-transfer workflows under specific conditions. BigQuery supports dataset copy and migration workflows with limitations. Review retention policies, encryption keys, IAM, external table definitions, and downstream dependencies before migrating production data.

Never delete the old dataset or bucket until row counts, object generations, table definitions, permissions, and dependent jobs have been verified at the destination.

## Evaluate global queries separately

BigQuery now offers global queries as a Preview feature. When explicitly enabled, a query can reference data in multiple BigQuery locations and copy the needed remote data to a primary location. A query with a destination table executes in the destination table's location.

Global queries do not change Cloud Storage colocation guidance or transfer-cost considerations for external tables. They address the separate boundary between BigQuery dataset locations.

Adopting global queries requires deliberate configuration in the execution region and each remote data region, plus the `bigquery.jobs.createGlobalQuery` permission. The feature can add regional compute, data replication, temporary storage, latency, and data-residency implications, and it has Preview limitations. For a stable single-region pipeline, aligning datasets remains the lower-complexity fix.

## Official Documentation

- [Location considerations for external tables](https://cloud.google.com/bigquery/docs/external-tables#storage-location-considerations)
- [Create Cloud Storage external tables](https://cloud.google.com/bigquery/docs/external-data-cloud-storage)
- [BigQuery locations](https://cloud.google.com/bigquery/docs/locations)
- [Run BigQuery queries](https://cloud.google.com/bigquery/docs/running-queries)
- [Create BigQuery datasets](https://cloud.google.com/bigquery/docs/datasets)
- [BigQuery global queries](https://cloud.google.com/bigquery/docs/global-queries)
- [Move Cloud Storage buckets](https://cloud.google.com/storage/docs/moving-buckets)

## Conclusion

Resolve the location error by inventorying the bucket, external-table dataset, job, and destination dataset independently. Keep the external table's bucket in a documented compatible location, and use the same BigQuery location for the source and destination datasets unless your organization has deliberately adopted global queries. Explicit job locations make the resulting pipeline predictable.

# Why BigQuery Says `Dataset Was Not Found in Location US` When the Dataset Exists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, BigQuery, Data Location, Troubleshooting, SQL

Description: Diagnose BigQuery's location-qualified dataset error by verifying the project, actual dataset location, and query job location explicitly.

---

BigQuery's error is deliberately location-specific:

```text
Dataset PROJECT_ID:DATASET_ID was not found in location US
```

It does not always mean the dataset is absent. Google documents two causes: the dataset does not exist at the fully qualified project and dataset ID, or the request's location does not match the dataset's location.

A dataset in `EU`, `europe-west2`, or even `us-central1` is not a dataset in the `US` multi-region.

## Verify the fully qualified dataset

Do not rely on the active gcloud project or a dataset name shown in another browser tab. Set the identifiers explicitly:

```bash
PROJECT_ID='example-analytics-project'
DATASET_ID='events'

gcloud config get project

bq show --dataset_view=METADATA --format=prettyjson \
  "${PROJECT_ID}:${DATASET_ID}"
```

Check the returned `id` and `location` fields. If the command fails, verify spelling, the supplied project ID, IAM access, and whether the dataset was deleted. A fully qualified ID prevents `bq show events` from silently checking the current default project.

IAM-related errors can be ambiguous about whether a resource exists. Ensure the diagnostic identity has the `bigquery.datasets.get` permission before concluding that the dataset is missing.

## Run the query in the dataset's actual location

Use the exact location returned by `bq show`:

```bash
DATASET_LOCATION='europe-west2'

bq --location="${DATASET_LOCATION}" query \
  --use_legacy_sql=false \
  'SELECT COUNT(*) FROM `example-analytics-project.events.page_views`'
```

In the Google Cloud console, open Query settings, expand the advanced options, and set Data location to the dataset's location. For API-created jobs, set `jobReference.location`. Client libraries expose an equivalent query-location option.

Use fully qualified table names in SQL:

```sql
SELECT
  COUNT(*) AS row_count
FROM
  `example-analytics-project.events.page_views`;
```

An unqualified project can make the query resolve `events` in a different project from the one inspected.

## Understand why BigQuery chose `US`

BigQuery normally infers job location from referenced datasets, a referenced connection, or a destination table. When it cannot infer a location and no project, organization, session, or job default applies, the job runs in the `US` multi-region.

This often affects:

- Queries assembled dynamically, because dynamic SQL cannot be parsed early enough for automatic location selection.
- Scripts whose regional resource references cannot be determined before execution.
- Jobs that set a destination table in another location.
- Tools or schedulers that submit `jobReference.location=US` by default.
- Console query settings with Data location explicitly set to another location.

For a BigQuery script, the `@@location` system variable can set the location when it is the first statement:

```sql
SET @@location = 'europe-west2';

SELECT
  COUNT(*)
FROM
  `example-analytics-project.events.page_views`;
```

For automation, an explicit CLI or API job location is usually easier to audit than relying on inference.

## `US` and `us-central1` are different locations

The `US` multi-region and `us-central1` single region are separate BigQuery locations. Geographic containment does not make them interchangeable for an ordinary regional query.

If a query reads a `US` dataset and a `us-central1` dataset, or reads one and writes to the other, it is a cross-location query. Do not fix this by changing only capitalization or by assuming the multi-region contains every compatible single-region job.

BigQuery's global queries feature can execute some cross-location queries when explicitly enabled, but it is currently Preview. It requires regional configuration and `bigquery.jobs.createGlobalQuery`, copies remote data temporarily, adds cost and latency considerations, and has documented limitations. Enabling it is an architecture decision, not a substitute for correcting an accidentally wrong job location.

## Check the destination as well as the source

A destination table determines where a query with a destination executes. Inspect both datasets:

```bash
bq show --dataset_view=METADATA --format=prettyjson \
  'example-analytics-project:events'

bq show --dataset_view=METADATA --format=prettyjson \
  'example-reporting-project:reports'
```

Without a deliberately configured global query, use a destination dataset in the same location as the source. Dataset location is chosen when the dataset is created and cannot be changed later. To use another location, create or copy to a new dataset and update dependent jobs after validation.

## Make the location part of deployment configuration

Store the BigQuery location alongside the project and dataset IDs used by a service:

```bash
export BIGQUERY_PROJECT_ID='example-analytics-project'
export BIGQUERY_DATASET_ID='events'
export BIGQUERY_LOCATION='europe-west2'
```

At startup or deployment, compare the configured location with dataset metadata and fail before a scheduled job runs in the wrong region. Also make reservation location, encryption key location, data residency, and external data locations part of the design review.

## Official Documentation

- [Troubleshoot BigQuery query issues](https://cloud.google.com/bigquery/docs/troubleshoot-queries#location_not_found)
- [BigQuery locations and job location selection](https://cloud.google.com/bigquery/docs/locations)
- [Run BigQuery queries](https://cloud.google.com/bigquery/docs/running-queries)
- [Introduction to BigQuery datasets](https://cloud.google.com/bigquery/docs/datasets-intro)
- [Configure BigQuery default settings](https://cloud.google.com/bigquery/docs/default-configuration)
- [BigQuery global queries](https://cloud.google.com/bigquery/docs/global-queries)

## Conclusion

When an existing dataset is not found in `US`, verify the full project and dataset ID, read the dataset's actual location, and submit the job in that exact location. Remember that `US` and `us-central1` are distinct. Explicit project IDs and job locations eliminate most false not-found errors before any data migration is considered.

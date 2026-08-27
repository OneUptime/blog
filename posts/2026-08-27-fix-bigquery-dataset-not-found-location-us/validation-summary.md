# Validation Summary: Why BigQuery Says `Dataset Was Not Found in Location US` When the Dataset Exists

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Google Cloud BigQuery
- GoogleSQL
- BigQuery `bq` command-line tool
- Google Cloud CLI (`gcloud`)
- BigQuery REST API and client libraries
- Google Cloud IAM
- BigQuery locations, defaults, and global queries

## Sources Consulted

- [Troubleshoot BigQuery query issues](https://cloud.google.com/bigquery/docs/troubleshoot-queries#location_not_found)
- [BigQuery locations and job location selection](https://cloud.google.com/bigquery/docs/locations#specify_locations)
- [Run BigQuery queries](https://cloud.google.com/bigquery/docs/running-queries)
- [List and inspect BigQuery datasets](https://cloud.google.com/bigquery/docs/listing-datasets#get_information_about_datasets)
- [`bq` command-line tool reference](https://cloud.google.com/bigquery/docs/reference/bq-cli-reference)
- [`gcloud config get` reference](https://cloud.google.com/sdk/gcloud/reference/config/get)
- [BigQuery `datasets.get` REST method](https://cloud.google.com/bigquery/docs/reference/rest/v2/datasets/get)
- [Changes to dataset-level access controls](https://cloud.google.com/bigquery/docs/dataset-access-control#changes_to_bq_command-line_tool_commands)
- [Troubleshoot IAM permissions in BigQuery](https://cloud.google.com/bigquery/docs/troubleshoot-access-control)
- [BigQuery system variables reference](https://cloud.google.com/bigquery/docs/reference/system-variables)
- [Configure BigQuery default settings](https://cloud.google.com/bigquery/docs/default-configuration)
- [BigQuery global queries](https://cloud.google.com/bigquery/docs/global-queries)
- [Introduction to BigQuery datasets](https://cloud.google.com/bigquery/docs/datasets-intro)
- [Manage and copy BigQuery datasets](https://cloud.google.com/bigquery/docs/managing-datasets#copy-dataset)

## Issues Found

- `gcloud config get-value project` is now only a backward-compatibility alias whose CLI help warns may disappear. It was replaced with the current documented command, `gcloud config get project`.
- The original `bq show` examples requested the default `FULL` dataset view even though the guide only needs metadata. Under fine-grained dataset ACL enforcement, that view can also require `bigquery.datasets.getIamPolicy`. The examples now use `--dataset_view=METADATA`, and the IAM guidance names the required `bigquery.datasets.get` permission.
- The diagnostic text told readers to verify the selected project after using a fully qualified dataset ID. Because that lookup uses the supplied project ID, the text now tells readers to verify the supplied project ID.
- The statement that IAM intentionally hides resource existence attributed intent not stated in the documentation. It was replaced with the documented, narrower point that IAM-related errors can be ambiguous about whether a resource exists.
- The claim that scripts are affected whenever their first operations do not reference a regional resource was overbroad. BigQuery determines location from resources referenced in the request, including statically visible references later in a script. The bullet now covers scripts whose regional references cannot be determined before execution.
- Ordinary console-tab persistence behavior is not documented. The corresponding bullet now refers to the documented case in which the console query's Data location setting is explicitly set to another location.

## Review Notes

All remaining commands, flags, SQL examples, API field names, location-selection rules, destination-table behavior, and documentation links were verified against current official Google Cloud documentation. `US` and `us-central1` are distinct BigQuery locations as of the validation date, and global queries remain a Preview feature that requires regional configuration and the `bigquery.jobs.createGlobalQuery` permission.

Cross-region dataset copying is currently Beta and has documented limitations, but the post's high-level guidance to create or copy into a new dataset is accurate. The locations documentation also announces a later-2026 terminology change for multi-regions; it currently still states that single-region and multi-region location names do not match, so this point should be rechecked before a future republication.

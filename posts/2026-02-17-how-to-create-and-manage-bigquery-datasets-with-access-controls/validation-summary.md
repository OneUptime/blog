# Validation Summary: How to Create and Manage BigQuery Datasets with Access Controls

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery datasets
- BigQuery IAM and dataset access entries
- bq command-line tool
- Terraform Google provider
- BigQuery column-level security and Data Catalog policy tags
- BigQuery row-level security
- BigQuery Data Transfer Service dataset copy

## Sources Consulted
- Google Cloud BigQuery create datasets documentation: https://cloud.google.com/bigquery/docs/datasets
- Google Cloud BigQuery basic dataset roles documentation: https://cloud.google.com/bigquery/docs/access-control-basic-roles
- Google Cloud BigQuery IAM access control documentation: https://cloud.google.com/bigquery/docs/control-access-to-resources-iam
- Google Cloud BigQuery bq CLI reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Google Cloud BigQuery dataset access control changes documentation: https://cloud.google.com/bigquery/docs/dataset-access-control
- Google Cloud BigQuery column-level security documentation: https://cloud.google.com/bigquery/docs/column-level-security
- Google Cloud BigQuery row-level security documentation: https://cloud.google.com/bigquery/docs/managing-row-level-security
- Google Cloud BigQuery manage datasets / dataset copy documentation: https://cloud.google.com/bigquery/docs/managing-datasets
- Google Cloud SDK Data Catalog taxonomy command reference: https://cloud.google.com/sdk/gcloud/reference/data-catalog/taxonomies
- Google Cloud SDK Data Catalog taxonomy import command reference: https://cloud.google.com/sdk/gcloud/reference/data-catalog/taxonomies/import
- Google Cloud Data Catalog SerializedTaxonomy API reference: https://cloud.google.com/data-catalog/docs/reference/rest/v1/SerializedTaxonomy
- Terraform Google provider `google_bigquery_dataset` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset

## Issues Found
- The dataset access examples used `bq update --access_entry`, which is not a documented current `bq update` flag. Replaced this with the documented `bq show` / edit dataset JSON / `bq update --source` workflow for dataset access entries.
- The text said access controls could be set directly during dataset creation with the shown command, but the example did not set access controls during creation. Reworded the section to create the dataset first and then grant access.
- The READER role description implied that read access alone is sufficient to run queries. Updated it to note that query jobs also require `bigquery.jobs.create`, commonly through `roles/bigquery.jobUser`.
- The dataset-level IAM example used a project-level `gcloud projects add-iam-policy-binding` with a resource condition instead of a direct dataset-level grant. Replaced it with BigQuery SQL DCL `GRANT ... ON SCHEMA`, which is documented for dataset-level IAM grants.
- The Data Catalog examples used `gcloud data-catalog taxonomies create` and `gcloud data-catalog taxonomies policy-tags create`, which are not listed in the current GA command reference. Replaced them with a `gcloud data-catalog taxonomies import` example using a serialized taxonomy containing the policy tag.
- The policy-tag schema update used inline JSON with `bq update --schema`, while the documented `--schema` value is a schema file path or comma-separated schema. Replaced it with a schema file example.
- The row access policy listing example queried `INFORMATION_SCHEMA.ROW_ACCESS_POLICIES`, but current row-level security documentation lists `bq ls --row_access_policies`, console, and API methods. Replaced the SQL query with the documented `bq ls --row_access_policies` command.
- The dataset copy section implied that copying a dataset maintains access controls. Updated the wording to clarify that access controls should be managed on the target dataset.

## Review Notes
The post uses legacy dataset basic roles (`READER`, `WRITER`, `OWNER`) alongside IAM roles. This is technically valid because BigQuery maps dataset-level predefined IAM roles to dataset basic roles, but future posts could simplify examples by using IAM/DCL consistently.

# Validation Summary: How to Set Up BigQuery Omni to Query Data in AWS S3 and Azure Blob Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery
- BigQuery Omni
- BigLake external tables
- AWS S3
- AWS IAM roles and trust policies
- Azure Blob Storage
- Microsoft Entra ID applications and service principals
- Azure workload identity federation
- BigQuery SQL
- Google Cloud `bq` CLI
- Azure CLI

## Sources Consulted
- Google Cloud documentation: Connect to Amazon S3 with BigQuery Omni - https://docs.cloud.google.com/bigquery/docs/omni-aws-create-connection
- Google Cloud documentation: Create Amazon S3 BigLake external tables - https://docs.cloud.google.com/bigquery/docs/omni-aws-create-external-table
- Google Cloud documentation: Connect to Blob Storage with BigQuery Omni - https://docs.cloud.google.com/bigquery/docs/omni-azure-create-connection
- Google Cloud documentation: Create Blob Storage BigLake tables - https://docs.cloud.google.com/bigquery/docs/omni-azure-create-external-table
- Google Cloud documentation: Metadata caching for external tables - https://docs.cloud.google.com/bigquery/docs/metadata-caching-external-tables
- Google Cloud documentation: Introduction to BigQuery Omni - https://cloud.google.com/bigquery/docs/omni-introduction
- Google Cloud documentation: BigQuery locations - https://cloud.google.com/bigquery/docs/locations
- Google Cloud pricing: BigQuery Omni pricing - https://cloud.google.com/bigquery/pricing
- Microsoft Learn: `az ad app federated-credential` Azure CLI reference - https://learn.microsoft.com/en-us/cli/azure/ad/app/federated-credential
- Microsoft Learn: `az ad sp` Azure CLI reference - https://learn.microsoft.com/cli/azure/ad/sp

## Issues Found
- The AWS `bq mk --connection` example used a generic `--properties` payload instead of the current documented `--iam_role_id` flag. Updated the command to use `--iam_role_id`.
- The AWS trust policy text referred to a generated service account ID before the connection exists. Updated the setup to use a placeholder initially and then replace it with the BigQuery Google identity returned by the connection creation command.
- The Azure `bq mk --connection` example used a generic `--properties` payload instead of the current documented flags. Updated it to use `--tenant_id`, `--federated_azure=true`, and `--federated_app_client_id`.
- The Azure setup omitted the required federated credential that lets the BigQuery Google identity access the Azure application. Added the `az ad app federated-credential create` step using the BigQuery connection `SUBJECT_ID`.
- The Azure role assignment used the less precise `--assignee` placeholder. Updated it to use `--assignee-object-id` and `--assignee-principal-type ServicePrincipal`, matching the documented role assignment pattern.
- The cost section incorrectly stated that there is no on-demand pricing for BigQuery Omni queries. Updated it to state that BigQuery Omni supports both on-demand compute pricing and Enterprise edition reservations in Omni regions.

## Review Notes
The SQL examples for creating S3 and Azure Blob Storage BigLake external tables, metadata caching options, Hive partitioned table syntax, supported Omni locations used in the examples, and general cross-cloud join explanation are consistent with the official Google Cloud documentation. Cross-cloud joins have additional documented limitations such as transfer size limits, regional colocation requirements, and no BigQuery free tier or sandbox support; these are not errors in the post but could be expanded in a future revision.

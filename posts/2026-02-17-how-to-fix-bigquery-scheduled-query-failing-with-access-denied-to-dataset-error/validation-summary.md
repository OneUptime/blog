# Validation Summary: How to Fix BigQuery Scheduled Query Failing with Access Denied to Dataset Error

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery scheduled queries
- BigQuery Data Transfer Service
- Google Cloud IAM
- Google Cloud CLI and bq CLI
- VPC Service Controls

## Sources Consulted
- BigQuery scheduled queries documentation: https://cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery bq command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery GoogleSQL DCL documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-control-language
- BigQuery IAM resource access documentation: https://cloud.google.com/bigquery/docs/control-access-to-resources-iam
- BigQuery basic roles and dataset role mappings: https://cloud.google.com/bigquery/docs/access-control-basic-roles
- gcloud projects add-iam-policy-binding reference: https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- VPC Service Controls service perimeter documentation: https://cloud.google.com/vpc-service-controls/docs/service-perimeters
- VPC Service Controls access levels documentation: https://cloud.google.com/vpc-service-controls/docs/use-access-levels

## Issues Found
- The dataset access example for a user showed `bq show` followed by a label update, which would not grant BigQuery dataset access. Replaced it with a documented BigQuery DCL `GRANT` statement for `roles/bigquery.dataViewer` on the source dataset.
- The accompanying `gcloud projects add-iam-policy-binding` example was described as dataset-level access, but that command grants IAM at the project level. Updated the text and comment to say project-level access.
- The destination dataset permission example used a `bq update --source` dataset resource replacement pattern that could overwrite existing access entries and was not the clearest current approach. Replaced it with a BigQuery DCL `GRANT` statement for `roles/bigquery.dataEditor` on the destination dataset.
- The command to switch a scheduled query to a service account omitted `--update_credentials`, which the BigQuery scheduled query documentation requires when updating credentials. Added the flag.
- The cross-project BigQuery DCL example quoted the project and dataset as a single identifier. Updated it to quote the hyphenated project ID as its own path component.
- The destination permissions note referred to the legacy `WRITER` role as the primary dataset role. Updated it to use the IAM role name `roles/bigquery.dataEditor`, which maps to dataset writer access.
- The VPC Service Controls remediation sentence was too specific and potentially misleading. Updated it to mention ingress or egress rules and access levels for the scheduled query service account.
- The Cloud Console navigation label was outdated. Updated it from BigQuery > Scheduled Queries to BigQuery > Scheduling.

## Review Notes
The article is technically relevant and correct after the fixes. Some examples still use placeholders such as `<config-id>`; in production, users may need the full transfer configuration resource name, such as `projects/PROJECT_ID/locations/LOCATION/transferConfigs/CONFIG_ID`, depending on the command context.

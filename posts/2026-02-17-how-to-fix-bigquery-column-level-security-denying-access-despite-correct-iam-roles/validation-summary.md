# Validation Summary: Fix BigQuery Column-Level Security Denying Access Despite Correct IAM Roles

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google BigQuery
- BigQuery column-level access control
- Data Catalog policy tags and taxonomies
- BigQuery data masking and data policies
- Google Cloud IAM
- gcloud CLI
- BigQuery INFORMATION_SCHEMA

## Sources Consulted
- BigQuery column-level access control overview: https://docs.cloud.google.com/bigquery/docs/column-level-security-intro
- BigQuery column-level access control setup and troubleshooting: https://docs.cloud.google.com/bigquery/docs/column-level-security
- BigQuery data masking guide: https://docs.cloud.google.com/bigquery/docs/column-data-masking
- BigQuery data masking overview: https://docs.cloud.google.com/bigquery/docs/column-data-masking-intro
- BigQuery Data Policy API v2 reference: https://docs.cloud.google.com/bigquery/docs/reference/bigquerydatapolicy/rest/v2/projects.locations.dataPolicies
- BigQuery Data Policy API setIamPolicy reference: https://docs.cloud.google.com/bigquery/docs/reference/bigquerydatapolicy/rest/v2/projects.locations.dataPolicies/setIamPolicy
- BigQuery INFORMATION_SCHEMA COLUMN_FIELD_PATHS reference: https://docs.cloud.google.com/bigquery/docs/information-schema-column-field-paths
- Google Cloud Data Catalog roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/datacatalog
- gcloud data-catalog policy-tags add-iam-policy-binding reference: https://docs.cloud.google.com/sdk/gcloud/reference/data-catalog/taxonomies/policy-tags/add-iam-policy-binding
- gcloud data-catalog taxonomies and policy-tags reference: https://docs.cloud.google.com/sdk/gcloud/reference/data-catalog/taxonomies

## Issues Found
- The post incorrectly said project-level `roles/datacatalog.categoryFineGrainedReader` grants do not work for column-level security. Current BigQuery troubleshooting documentation says Fine-Grained Reader can be granted at levels including organization, folder, project, and policy tag. I changed the guidance to recommend policy-tag-level grants for least privilege while acknowledging inherited project, folder, and organization grants.
- The post implied the basic project Owner role was enough context for Fine-Grained Reader access. Google Cloud IAM role documentation does not list `datacatalog.categories.fineGrainedGet` under Owner; I clarified that the relevant Fine-Grained Reader permission is still required.
- The data masking section used `gcloud data-catalog taxonomies policy-tags list` as a way to check masking rules and granted `roles/bigquerydatapolicy.maskedReader` on a policy tag with the Data Catalog policy-tag IAM command. Current BigQuery masking documentation uses data policies, and the BigQuery Data Policy API exposes data policy listing and `setIamPolicy`. I replaced those examples with BigQuery Data Policy API calls.
- The debugging checklist and Mermaid diagram still said to treat project-level Fine-Grained Reader as invalid. I updated both to account for inherited IAM grants.

## Review Notes
Data Catalog itself is deprecated in favor of Dataplex Universal Catalog, but the current BigQuery column-level access control documentation still uses Data Catalog policy tags, Data Catalog roles, and the `gcloud data-catalog taxonomies policy-tags` command group for policy-tag workflows.

# Validation Summary: How to Configure VPC Service Controls for BigQuery Cross-Project Access

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Google Cloud VPC Service Controls
- Access Context Manager ingress and egress policies
- BigQuery
- BigQuery public datasets
- BigQuery authorized views and datasets
- BigQuery Data Transfer Service
- BigQuery scheduled queries
- Google Cloud CLI and bq CLI
- Cloud Audit Logs

## Sources Consulted
- Google Cloud VPC Service Controls ingress and egress rules: https://docs.cloud.google.com/vpc-service-controls/docs/ingress-egress-rules
- Google Cloud VPC Service Controls configuring ingress and egress policies: https://docs.cloud.google.com/vpc-service-controls/docs/configuring-ingress-egress-policies
- Google Cloud VPC Service Controls supported service method restrictions: https://docs.cloud.google.com/vpc-service-controls/docs/supported-method-restrictions
- Google Cloud VPC Service Controls supported products and limitations: https://docs.cloud.google.com/vpc-service-controls/docs/supported-products
- BigQuery VPC Service Controls: https://docs.cloud.google.com/bigquery/docs/vpc-sc
- BigQuery Data Transfer Service service agent documentation: https://docs.cloud.google.com/bigquery/docs/enable-transfer-service
- BigQuery scheduled queries documentation: https://docs.cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery sharing VPC Service Controls rules: https://docs.cloud.google.com/bigquery/docs/analytics-hub-vpc-sc-rules

## Issues Found
- The BigQuery method selectors used fully qualified audit-log style names such as `google.cloud.bigquery.v2.JobService.InsertJob`. Google Cloud's VPC Service Controls supported method restriction list documents BigQuery method selectors as `JobService.InsertJob`, `TableService.GetTable`, `TableDataService.List`, and similar short service method names. Updated all BigQuery selector examples and the reference table.
- The public datasets egress example used `projects/bigquery-public-data` in the `resources` field. VPC Service Controls egress resources are project-number identifiers such as `projects/PROJECT_NUMBER`. Updated the example to use `projects/PUBLIC_DATASET_PROJECT_NUMBER` and clarified that the fetched project number must be used in the rule.
- The cross-perimeter BigQuery example did not mention that the perimeter containing the protected BigQuery data may need an egress rule allowing the BigQuery job project. Added a small Project B egress example and updated the apply command text.
- The authorized views section said the BigQuery service account needed permissions, but the VPC Service Controls requirement is that service perimeters are enforced for both the view project and source data projects, and an egress rule is required if they are separated. Updated that explanation.
- The BigQuery Data Transfer Service example omitted `bigquerydatatransfer.googleapis.com` even though that is the protected API service name for the transfer service. Added it to the operations list while leaving the BigQuery and Cloud Storage operations used by transfer workflows.
- The scheduled query section said scheduled queries run under the BigQuery service account and used the non-existent `gcp-sa-bigquerydts.iam.gserviceaccount.com` service-agent domain. BigQuery scheduled queries use BigQuery Data Transfer Service and run with configured transfer credentials, such as a user or service account. Updated the explanation and example identity accordingly.

## Review Notes
The examples still use broad `method: "*"` selectors in some scenarios. That is technically valid and aligns with the post's advice to tighten rules using dry-run and audit logs, but production configurations should narrow methods and identities wherever possible.

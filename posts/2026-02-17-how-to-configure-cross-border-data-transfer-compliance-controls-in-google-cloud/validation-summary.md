# Validation Summary: How to Configure Cross-Border Data Transfer Compliance Controls in Google Cloud

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud
- Cloud Asset Inventory
- Resource Manager folders
- Organization Policy Service
- VPC Service Controls
- BigQuery
- BigQuery Data Transfer Service
- Cloud Logging audit sinks
- Python Google Cloud client libraries
- GDPR cross-border transfer mechanisms

## Sources Consulted
- Google Cloud SDK: `gcloud resource-manager org-policies set-policy` - https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Google Cloud Resource Manager: Restricting resource locations - https://docs.cloud.google.com/resource-manager/docs/organization-policy/defining-locations
- Google Cloud Resource Manager: Organization policy constraints - https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Google Cloud SDK: `gcloud access-context-manager perimeters create` - https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/create
- Google Cloud SDK: `gcloud access-context-manager perimeters update` - https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/update
- VPC Service Controls ingress and egress rules - https://docs.cloud.google.com/vpc-service-controls/docs/ingress-egress-rules
- VPC Service Controls supported service method restrictions - https://docs.cloud.google.com/vpc-service-controls/docs/supported-method-restrictions
- VPC Service Controls supported products and limitations - https://docs.cloud.google.com/vpc-service-controls/docs/supported-products
- Cloud Asset Inventory `searchAllResources` reference - https://docs.cloud.google.com/asset-inventory/docs/reference/rest/v1/TopLevel/searchAllResources
- Cloud Asset Inventory resource search guide - https://docs.cloud.google.com/asset-inventory/docs/search-resources
- BigQuery dataset copy and cross-region copy documentation - https://docs.cloud.google.com/bigquery/docs/managing-datasets
- BigQuery dataset location notes - https://cloud.google.com/bigquery/docs/datasets
- Sensitive Data Protection de-identification documentation - https://docs.cloud.google.com/sensitive-data-protection/docs/deidentify-sensitive-data
- Sensitive Data Protection inspect job and action references - https://docs.cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/InspectJobConfig and https://docs.cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/Action
- Cloud Logging sink creation reference - https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Cloud Logging aggregated sinks documentation - https://docs.cloud.google.com/logging/docs/export/aggregated_sinks
- Cloud Logging BigQuery export schema documentation - https://cloud.google.com/logging/docs/export/bigquery
- European Data Protection Board transfer guidance and adequacy/SCC context - https://www.edpb.europa.eu/

## Issues Found
- The GDPR overview described SCCs and adequacy decisions as a "legal basis." I changed this to "Chapter V transfer mechanism," which is the more accurate GDPR terminology for transfers outside the EU/EEA.
- The localization-law sentence overgeneralized India as having broad data localization laws. I narrowed it to sector-specific localization or transfer restrictions.
- The VPC Service Controls section referred to egress policy configuration as "bridges." I changed this to egress rules and added the required caveat that a separate destination perimeter can also need a matching ingress rule.
- The VPC Service Controls egress sample used `google.cloud.bigquery.v2.JobService.InsertJob`; the supported method restriction name is `JobService.InsertJob`, so I corrected the method selector.
- The data processing Python sample created an unused Sensitive Data Protection `deidentify_config` and then launched an inspect job with `save_findings`, which saves findings rather than writing de-identified BigQuery data. I replaced it with a BigQuery sanitization query followed by a BigQuery Data Transfer Service `cross_region_copy` configuration for the sanitized dataset.
- The Cloud Logging sink command used a non-existent `--destination` flag. I corrected the command to pass the BigQuery destination as the required positional argument and added `--include-children` for an organization-level aggregated sink.
- The BigQuery audit-log query referenced `protopayload_auditlog.request`; routed audit logs expose that field as `protopayload_auditlog.requestJson`, so I corrected the JSON extraction expression.

## Review Notes
The examples remain illustrative and still need environment-specific values such as project IDs, folder IDs, access policy IDs, dataset locations, IAM grants, and VPC Service Controls ingress rules for destination perimeters. The Google Cloud client libraries are not installed in this workspace, so I verified Python syntax locally but relied on official Google Cloud references for API and CLI correctness.

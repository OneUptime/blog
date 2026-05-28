# Validation Summary: How to Configure FedRAMP High Baseline Controls with Assured Workloads on GCP

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Google Cloud Assured Workloads
- FedRAMP High and NIST SP 800-53 controls
- Google Cloud CLI (`gcloud`, `bq`)
- Cloud KMS and Cloud HSM
- Customer-managed encryption keys (CMEK)
- Organization Policy Service
- Cloud Audit Logs and Cloud Logging sinks
- Cloud Monitoring alert policies
- VPC Service Controls
- Terraform Google provider

## Sources Consulted
- Google Cloud SDK reference for `gcloud assured workloads create`: https://docs.cloud.google.com/sdk/gcloud/reference/assured/workloads/create
- Assured Workloads overview: https://docs.cloud.google.com/assured-workloads/docs/overview
- Assured Workloads control packages: https://docs.cloud.google.com/assured-workloads/docs/control-packages
- Assured Workloads locations: https://cloud.google.com/assured-workloads/docs/locations
- Google Cloud organization policy constraints: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Google Cloud SDK reference for organization policy `set-policy`: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Cloud KMS CMEK organization policies: https://docs.cloud.google.com/kms/docs/cmek-org-policy
- Cloud KMS / Cloud HSM documentation: https://docs.cloud.google.com/kms/docs/hsm
- Google Cloud SDK reference for `gcloud kms keys create`: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Cloud Logging Data Access audit log configuration: https://cloud.google.com/logging/docs/audit/configure-data-access
- Cloud Logging sink routing documentation: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud SDK reference for `gcloud logging sinks create`: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Cloud Monitoring alert policy reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Cloud Logging log-based alerting policies: https://cloud.google.com/logging/docs/alerting/log-based-alerts
- Google Cloud SDK reference for `gcloud assured workloads violations list`: https://docs.cloud.google.com/sdk/gcloud/reference/assured/workloads/violations/list
- VPC Service Controls supported products: https://docs.cloud.google.com/vpc-service-controls/docs/supported-products
- Terraform Google provider `google_assured_workloads_workload` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/assured_workloads_workload
- NIST SP 800-53 Rev. 5 publication page: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- FedRAMP baselines and impact levels: https://www.fedramp.gov/understanding-baselines-and-impact-levels/

## Issues Found
- The Assured Workloads create command used an unqualified billing account ID and an organization resource as `--provisioned-resources-parent`. Updated the billing account to `billingAccounts/BILLING_ACCOUNT_ID` and the provisioned parent to `folders/PARENT_FOLDER_ID`, matching the documented formats.
- The post overstated personnel controls as applying to all Google employees accessing infrastructure. Updated the claim to support personnel and subprocessors, which matches Google Cloud's Assured Workloads control-package wording.
- The post stated that FedRAMP High requires CMEK. Updated this to describe CMEK as required when the workload needs customer-managed keys, while retaining the FIPS 140-2 Cloud HSM guidance.
- The public IP organization policy used `enable-enforce` on `compute.vmExternalIpAccess`, which is a list constraint, not a boolean constraint. Replaced it with a `set-policy` example using `listPolicy.allValues: DENY`.
- The audit logging example applied a partial IAM policy file directly, which would risk replacing existing IAM bindings. Updated the workflow to export the existing policy, add `auditConfigs`, preserve `bindings`, `etag`, and `version`, then apply it.
- The log sink flow created the sink before the destination bucket and omitted the writer identity permission grant. Reordered the bucket creation before sink creation and added commands to retrieve the writer identity and grant `roles/storage.objectCreator`.
- The Cloud Monitoring alert command used a log query as a metric threshold filter and omitted required threshold details. Replaced it with a documented log-based alerting policy file using `conditionMatchedLog`.
- The Terraform snippet referenced an undefined KMS key ring and used the deprecated `kms_settings` block on `google_assured_workloads_workload`. Removed the deprecated block and added a `google_kms_key_ring` resource.
- The post referenced a fixed count of 421 NIST SP 800-53 High baseline controls, which is outdated/version-dependent. Replaced it with a version-neutral reference to the current FedRAMP High baseline controls.

## Review Notes
The guide is still a high-level implementation template, not a complete FedRAMP authorization plan. Readers should validate exact control mappings, support-plan requirements, service availability, Assured Workloads package selection, and inherited controls with their compliance team and current Google Cloud/FedRAMP documentation before production use.

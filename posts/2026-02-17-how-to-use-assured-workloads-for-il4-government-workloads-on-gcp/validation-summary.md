# Validation Summary: How to Use Assured Workloads for IL4 Government Workloads on GCP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Assured Workloads
- Data Boundary for Impact Level 4 (IL4)
- Google Cloud CLI (`gcloud`)
- Organization Policy
- Cloud KMS and CMEK
- Compute Engine
- Cloud Storage
- Cloud Logging audit sinks
- VPC networking and firewall rules

## Sources Consulted
- Google Cloud Assured Workloads Data Boundary for IL4 documentation: https://docs.cloud.google.com/assured-workloads/docs/control-packages/il4
- Google Cloud Assured Workloads create folder guide: https://docs.cloud.google.com/assured-workloads/docs/create-folder
- Google Cloud Assured Workloads locations: https://docs.cloud.google.com/assured-workloads/docs/locations
- Google Cloud Assured Workloads key management: https://docs.cloud.google.com/assured-workloads/docs/key-management
- `gcloud assured workloads create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/assured/workloads/create
- `gcloud org-policies describe` reference: https://cloud.google.com/sdk/gcloud/reference/org-policies/describe
- `gcloud kms keys create` reference: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Cloud KMS key creation documentation: https://docs.cloud.google.com/kms/docs/create-key
- Cloud KMS key purposes and algorithms: https://docs.cloud.google.com/kms/docs/algorithms
- `gcloud storage buckets create` reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Cloud Storage CMEK documentation: https://docs.cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- `gcloud logging sinks create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Assured Workloads violations monitoring: https://docs.cloud.google.com/assured-workloads/docs/monitor-folder

## Issues Found
- The post said IL4 data must reside in the continental United States and that only US persons can access data and infrastructure. Updated this to match Google Cloud's current wording: Data Boundary for IL4 sets US-only data location controls, and IL4 support cases are routed to US Persons located in the US.
- The prerequisites described a signed IL4 agreement, government sales engagement, and an IL4-approved billing account. Replaced these with documented prerequisites and constraints: a configured Google Cloud organization, Assured Workloads Admin role, Enhanced or Premium support for IL4 support cases, and Premium-tier billing.
- The `gcloud assured workloads create` example used `--compliance-regime=IL4`, an unqualified billing account ID, and a JSON `--resource-settings` value that does not match the current CLI reference. Updated the command to use `data-boundary-for-il4`, `billingAccounts/...`, and removed the invalid resource settings payload.
- The post said Assured Workloads automatically provisions a key project and key ring for IL4. Updated the wording because key project and key ring creation depends on CMEK configuration during folder creation, and cryptographic keys are not created automatically.
- The org policy examples used the outdated `gcloud resource-manager org-policies describe` form and included `constraints/` in the constraint name. Updated them to the current `gcloud org-policies describe gcp.resourceLocations` and `gcloud org-policies describe gcp.restrictServiceUsage` syntax.
- The CMEK section overstated the key-project provisioning flow and did not mention the IL4 `gcp.restrictNonCmekServices` control. Updated the explanation to match the IL4 control package documentation.
- The Cloud KMS examples used `--algorithm=google-symmetric-encryption`, which is not a valid `gcloud kms keys create` flag. Removed the invalid flag; symmetric encryption keys use the appropriate default algorithm for `--purpose=encryption`.
- The billing link command used an unqualified billing account ID. Updated it to `billingAccounts/BILLING_ACCOUNT_ID`.
- The logging sink example omitted an important requirement: the destination must already exist and the sink writer identity needs write permission. Added this note.
- The Cloud Storage CMEK verification example used a non-documented `default_encryption_key` format field. Replaced it with a bucket-list loop that checks the documented `default_kms_key` field via `gcloud storage buckets describe`.

## Review Notes
`gcloud` was not installed in the local workspace, so command validation was performed against official Google Cloud CLI documentation instead of local `--help` output.

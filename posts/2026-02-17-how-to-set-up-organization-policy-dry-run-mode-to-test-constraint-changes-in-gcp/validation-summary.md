# Validation Summary: How to Set Up Organization Policy Dry-Run Mode to Test Constraint Changes in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Organization Policy Service
- Organization policy dry-run mode
- Google Cloud CLI (`gcloud`)
- Cloud Audit Logs and Cloud Logging
- Terraform Google provider
- Compute Engine external IP organization policy constraints
- Cloud Storage organization policy constraints
- IAM service account key organization policy constraints

## Sources Consulted
- Google Cloud Organization Policy dry-run documentation: https://docs.cloud.google.com/organization-policy/test-policies
- Google Cloud Organization Policy REST `Policy` resource reference: https://docs.cloud.google.com/organization-policy/reference/rest/v2/organizations.policies
- Google Cloud SDK `gcloud org-policies set-policy` reference: https://cloud.google.com/sdk/gcloud/reference/org-policies/set-policy
- Google Cloud organization policy constraints reference: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Compute Engine external IP organization policy documentation: https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address
- Cloud Storage organization policy constraints documentation: https://cloud.google.com/storage/docs/org-policy-constraints
- Terraform Google provider `google_org_policy_policy` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/org_policy_policy

## Issues Found
- The dry-run audit log filters used `protoPayload.metadata.dryRun=true`, but Google Cloud dry-run audit metadata uses `dryRunResult` and `liveResult`. Updated the `gcloud logging read`, log-based metric, and BigQuery sink filters to use `protoPayload.metadata.dryRunResult="DENIED"` and `protoPayload.metadata.liveResult="ALLOWED"`.
- The Cloud Storage `storage.uniformBucketLevelAccess` example used `allowAll: true` in the live `spec`, but this is a boolean constraint. Changed the live rule to `enforce: false` while keeping the dry-run rule as `enforce: true`.
- The dry-run setup omitted the documented billing prerequisite. Added a prerequisite for billing to be enabled on the Google Cloud project used for testing dry-run policies.
- The `gcloud org-policies set-policy` examples that update policies did not specify an update mask. Added `--update-mask=*` to the examples that apply both live and dry-run specs or switch from dry-run to enforcement, matching current Google Cloud CLI guidance for updating existing policies.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK reference instead of local `--help` output.

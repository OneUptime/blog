# Validation Summary: How to Set Up Continuous Compliance Monitoring

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Organization Policy Service
- Google Cloud organization policy constraints and custom constraints
- Google Cloud Security Command Center and Security Health Analytics
- Google Cloud CLI
- Cloud Functions for Pub/Sub-triggered remediation
- Python Google Cloud client libraries for Compute Engine, Cloud Storage, Security Command Center, and BigQuery
- Cloud Scheduler

## Sources Consulted
- Google Cloud SDK reference: `gcloud resource-manager org-policies enable-enforce` - https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/enable-enforce
- Google Cloud SDK reference: `gcloud resource-manager org-policies set-policy` - https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Google Cloud SDK reference: `gcloud org-policies set-custom-constraint` - https://docs.cloud.google.com/sdk/gcloud/reference/org-policies/set-custom-constraint
- Google Cloud Organization Policy constraints reference - https://docs.cloud.google.com/organization-policy/reference/org-policy-constraints
- Google Cloud Organization Policy custom constraints guide - https://docs.cloud.google.com/resource-manager/docs/organization-policy/creating-managing-custom-constraints
- Google Cloud Storage organization policy constraints - https://cloud.google.com/storage/docs/org-policy-constraints
- Google Cloud Storage custom constraints - https://cloud.google.com/storage/docs/custom-constraints
- BigQuery custom constraints - https://docs.cloud.google.com/bigquery/docs/custom-constraints
- Security Command Center: Using Security Health Analytics - https://cloud.google.com/security-command-center/docs/how-to-use-security-health-analytics
- Security Command Center: Listing findings - https://docs.cloud.google.com/security-command-center/docs/how-to-api-list-findings
- Security Command Center Python `ListFindingsRequest` reference - https://cloud.google.com/python/docs/reference/securitycenter/latest/google.cloud.securitycenter_v2.types.ListFindingsRequest
- Cloud Storage Python IAM policy reference - https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.bucket.Bucket

## Issues Found
- The post used `enable-enforce` for `constraints/compute.vmExternalIpAccess`, but that is a list constraint, not a boolean constraint. Changed the command to `set-policy` and added an `external-ip-policy.yaml` example with `allValues: DENY`.
- The post described disabling public access to Cloud Storage buckets but enforced `constraints/storage.uniformBucketLevelAccess`. Changed this to `constraints/storage.publicAccessPrevention`, which is the organization policy constraint that blocks public access.
- The Cloud Storage custom constraint used an invalid CEL label existence expression. Changed it to the documented map membership form: `'data-classification' in resource.labels`.
- The custom constraints were enforced with `gcloud resource-manager org-policies enable-enforce`, but current custom organization policy examples use `gcloud org-policies set-policy` with a policy file. Added policy YAML examples for both custom constraints.
- The Security Command Center setup command used an unsupported `gcloud scc settings update --enable-modules` pattern. Changed it to the documented `gcloud alpha scc settings services enable --service=security-health-analytics` command.
- The Security Command Center findings list command omitted the required resource path shape and location used by current documentation. Changed it to `gcloud scc findings list organizations/ORG_ID --location=global`.
- The Cloud Functions Pub/Sub remediation example parsed `event["data"]` directly as JSON, but Pub/Sub background event data is base64 encoded. Added base64 decoding before `json.loads`.
- The remediation map referenced an undefined `remediate_open_ssh` function. Changed `OPEN_SSH_PORT` to reuse the firewall-rule remediation handler.
- The dashboard Python example used `datetime` without importing it. Added `import datetime`.
- The dashboard Python example used the older `securitycenter` import and a parent without location. Updated it to `securitycenter_v2` and `organizations/{org_id}/sources/-/locations/global`.

## Review Notes
The post is technically valid after the corrections. The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK documentation rather than local `--help` output. Python snippets were checked for syntax with `ast.parse`.

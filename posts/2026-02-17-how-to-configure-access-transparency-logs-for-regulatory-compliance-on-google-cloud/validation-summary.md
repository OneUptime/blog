# Validation Summary: How to Configure Access Transparency Logs for Regulatory Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Access Transparency
- Google Cloud Access Approval
- Cloud Logging and Log Router sinks
- BigQuery log exports and SQL queries
- Cloud Storage
- Cloud Monitoring alert policies
- Google Cloud CLI
- Python Google Cloud client libraries

## Sources Consulted
- Google Cloud Access Transparency overview: https://docs.cloud.google.com/assured-workloads/access-transparency/docs/overview
- Google Cloud Access Transparency enablement: https://docs.cloud.google.com/assured-workloads/access-transparency/docs/enable
- Google Cloud Access Transparency log fields: https://docs.cloud.google.com/assured-workloads/access-transparency/docs/reading-logs
- Google Cloud Access Transparency pricing: https://cloud.google.com/assured-workloads/access-transparency/pricing
- Google Cloud Access Approval CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/access-approval/settings/update
- Google Cloud Access Approval settings API reference: https://docs.cloud.google.com/assured-workloads/access-approval/docs/reference/rest/v1/AccessApprovalSettings
- Google Cloud Access Approval overview: https://docs.cloud.google.com/assured-workloads/access-approval/docs/overview
- Google Cloud Access Approval enrollment modes: https://docs.cloud.google.com/assured-workloads/access-approval/docs/review-approve-access-requests-google-keys#enrollment-mode
- Google Cloud Access Approval settings update REST method: https://docs.cloud.google.com/assured-workloads/access-approval/docs/reference/rest/v1/organizations/updateAccessApprovalSettings
- Python Access Approval AccessApprovalSettings type reference: https://docs.cloud.google.com/python/docs/reference/accessapproval/latest/google.cloud.accessapproval_v1.types.AccessApprovalSettings
- Cloud Logging sink destination reference: https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/organizations.sinks
- Cloud Logging routing guide: https://docs.cloud.google.com/logging/docs/export/configure_export_v2
- Cloud Logging aggregated sinks guide: https://docs.cloud.google.com/logging/docs/export/aggregated_sinks
- Cloud Logging query language: https://docs.cloud.google.com/logging/docs/view/logging-query-language
- Cloud Logging BigQuery export schema: https://cloud.google.com/logging/docs/export/bigquery
- Cloud Logging log-based alerting policies: https://docs.cloud.google.com/logging/docs/alerting/log-based-alerts
- Cloud Logging log-based metrics: https://cloud.google.com/logging/docs/logs-based-metrics/counter-metrics
- Cloud Storage bucket creation CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Cloud Monitoring Python AlertPolicy LogMatch reference: https://cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.types.AlertPolicy.Condition.LogMatch

## Issues Found
- The post incorrectly said Access Transparency required Premium or Enhanced Support. Updated it to reflect current Google Cloud documentation: Access Transparency is included for all Google Cloud organizations at no extra charge.
- The post used non-existent `gcloud access-transparency enable` and `gcloud access-transparency get` commands. Replaced these with the supported console verification workflow.
- The post used the Access Approval Python client as if it could enable Access Transparency. Removed that invalid sample and clarified that the Access Approval API only configures Access Approval.
- The log sink filters used `logName:"accessTransparency"`, which does not match Access Transparency logs. Replaced the filters with `log_id("cloudaudit.googleapis.com/access_transparency")`.
- The Cloud Storage archive sink did not grant the sink writer identity permission to write to the destination bucket. Added a bucket IAM binding for `roles/storage.objectCreator`.
- The BigQuery examples queried `protoPayload` audit-log fields, but current Access Transparency logs use a typed `jsonPayload`. Updated the SQL examples and report query to use the Access Transparency exported payload fields.
- The alerting example used invalid `protoPayload` field paths and omitted required log-based alert strategy settings. Updated the filters to use `jsonPayload.location.principalPhysicalLocationCountry` and added notification rate limit and auto-close settings.
- The high-volume alert example used a log-match condition, which alerts on matching log entries rather than a volume threshold. Renamed and adjusted it to an event-review alert. A future true volume threshold should use a logs-based counter metric.
- The Access Approval CLI flags used hyphenated names rather than the documented `--enrolled_services` and `--notification_emails` flags. Updated them.
- The Access Approval Python snippet depended on an import that had been removed with the invalid Access Transparency API sample. Added `from google.cloud import accessapproval_v1`.
- The compliance report sample imported `json` without using it and used deprecated naive UTC generation. Removed the unused import and changed the timestamp generation to `datetime.now(timezone.utc).isoformat()`.

## Revalidation - 2026-08-18

Prompted by feedback from the Google Cloud product manager for Access Transparency and Access Approval. Each point below was re-checked against current Google Cloud documentation before the post was changed.

### Issues Found
- The post treated Access Transparency as something you enable. Current documentation states it is a default security control for every Google Cloud organization. Rewrote the Prerequisites and retitled Step 1 from "Enable Access Transparency" to "Confirm Access Transparency Is Active", keeping a short note for organizations that predate the default rollout.
- The post gave only the IAM > Settings verification path. Documentation now also lists Security > Access Approval (Home tab). Added both paths.
- The post required `roles/axt.admin` just to verify the setting. Documentation lists `roles/accessapproval.viewer` for reading and `roles/axt.admin` for administering. Split the two.
- The post covered Access Approval enrollment but never mentioned operating modes, which is the setting that actually determines behavior. Added a mode table covering Transparency, Streamlined Support, and Access Approval with the `gcloud --approval_policy` values and the corresponding `justificationBasedApprovalPolicy` enum values, plus a recommendation to start in Transparency and tighten from there.
- The `gcloud access-approval settings update` example omitted the documented `--approval_policy` flag. Added it, along with follow-up examples for moving between modes.
- Added a REST `PATCH` example for `approvalPolicy`, including the `updateMask` query parameter. Without `updateMask` the API updates only `notificationEmails`, so a policy change would be silently dropped.

### Deliberately Not Changed
- The feedback described Transparency mode only as "all approval requests are automatically approved". The API reference is more precise - `JUSTIFICATION_BASED_APPROVAL_ENABLED_ALL` is "Audit-only mode. All accesses are pre-approved instantly." The post recommends starting there but states plainly that it is a recording rather than a control, so readers with a hard approval requirement do not stop at that step.
- The feedback stated that Access Approval is migrating to a default-on model for all customers. This is not yet reflected in the Access Approval overview or the release notes, both of which still describe explicit enrollment. The post mentions the migration as in progress rather than complete, and keeps the explicit enrollment instructions.
- `EnrolledService(cloud_product="all", enrollment_level=BLOCK_ALL)` remains valid and is unchanged.
- The Python client (v1.20.0) does not expose an `approval_policy` attribute on `AccessApprovalSettings`, so the mode is set via gcloud or REST only. Noted this in the Python sample's docstring rather than inventing an attribute.

## Review Notes
The corrected BigQuery queries assume the default date-sharded BigQuery export schema for Access Transparency logs routed by Cloud Logging. For new implementations, Google recommends considering a Cloud Logging bucket with Log Analytics and a linked BigQuery dataset when that better fits the retention and analysis model.

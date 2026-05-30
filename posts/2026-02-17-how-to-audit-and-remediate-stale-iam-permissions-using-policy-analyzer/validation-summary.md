# Validation Summary: How to Audit and Remediate Stale IAM Permissions Using Policy Analyzer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud Policy Intelligence
- Policy Analyzer for IAM allow policies
- Activity Analyzer
- IAM Recommender
- Cloud Asset Inventory API
- Cloud Audit Logs
- Cloud Functions
- Cloud Scheduler
- Pub/Sub
- Cloud Monitoring custom metrics
- Python Google Cloud client libraries
- gcloud CLI

## Sources Consulted
- Google Cloud Policy Analyzer for allow policies: https://docs.cloud.google.com/policy-intelligence/docs/policy-analyzer-overview
- Google Cloud Policy Intelligence overview: https://docs.cloud.google.com/policy-intelligence/docs/overview
- Google Cloud Policy Intelligence APIs and reference: https://docs.cloud.google.com/policy-intelligence/docs/apis
- `gcloud asset analyze-iam-policy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/asset/analyze-iam-policy
- Cloud Asset Inventory `analyzeIamPolicy` REST reference: https://docs.cloud.google.com/asset-inventory/docs/reference/rest/v1/TopLevel/analyzeIamPolicy
- Cloud Asset Inventory roles and permissions: https://cloud.google.com/asset-inventory/docs/roles-permissions
- Google Cloud full resource names: https://docs.cloud.google.com/iam/docs/full-resource-names
- `gcloud policy-intelligence query-activity` reference: https://docs.cloud.google.com/sdk/gcloud/reference/policy-intelligence/query-activity
- Activity Analyzer service account authentication documentation: https://docs.cloud.google.com/policy-intelligence/docs/activity-analyzer-service-account-authentication
- IAM role recommendations overview: https://docs.cloud.google.com/policy-intelligence/docs/role-recommendations-overview
- Recommender IDs: https://cloud.google.com/recommender/docs/recommenders
- `gcloud recommender recommendations list` reference: https://docs.cloud.google.com/sdk/gcloud/reference/recommender/recommendations/list
- Cloud Run functions deployment documentation: https://docs.cloud.google.com/functions/docs/deploy
- Cloud Scheduler Pub/Sub job documentation: https://docs.cloud.google.com/scheduler/docs/creating
- Cloud Monitoring user-defined metrics documentation: https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics
- Cloud Monitoring metric descriptor create REST reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.metricDescriptors/create

## Issues Found
- Corrected the explanation of Policy Analyzer. The original post said Policy Analyzer combines IAM policy data with Cloud Audit Logs and reports when permissions were last used. Official documentation says Policy Analyzer for allow policies uses Cloud Asset Inventory data to analyze configured IAM allow-policy access; Activity Analyzer and IAM Recommender provide separate usage signals.
- Replaced the Cloud SQL full resource name prefix from `cloudsql.googleapis.com` to `sqladmin.googleapis.com`, matching Google Cloud full resource name documentation.
- Fixed `gcloud asset analyze-iam-policy` output field paths from `accessControlList` to `accessControlLists` and selected `identities.name` for clearer table output.
- Clarified that `gcloud policy-intelligence query-activity --activity-type=serviceAccountLastAuthentication` reports service account authentication activity, not last use for every IAM permission.
- Updated the Python audit-log example to compare audit log `principalEmail` against bare user or service account email addresses instead of IAM member strings like `user:name@example.com`.
- Updated the Python example to avoid treating groups, domains, and other non-email IAM member types as directly checkable through `principalEmail`, because audit logs record the calling user or service account.
- Fixed the Google-managed service agent skip logic to account for IAM member strings beginning with `serviceAccount:service-`.
- Added the Recommender API and relevant IAM Recommender viewer role because the post uses IAM Recommender commands.
- Added Pub/Sub topic creation before the Cloud Scheduler and Cloud Functions examples, and added explicit Cloud Function region and Cloud Scheduler location.
- Replaced the unverified `gcloud monitoring metrics-descriptors create` command with a Cloud Monitoring REST API call to create the custom metric descriptor.
- Adjusted the IAM Recommender safety claim from "generally safe" to "a safer starting point" because Google documents role recommendations as usage- and ML-based recommendations that still require review.

## Review Notes
The Python example is syntactically valid, but it remains a starting-point audit script rather than a complete least-privilege engine. Audit-log activity is a coarse signal for a principal, while IAM Recommender is the more appropriate Google-provided source for permission-level usage over the observation period.

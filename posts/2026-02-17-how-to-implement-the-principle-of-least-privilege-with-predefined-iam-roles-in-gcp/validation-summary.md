# Validation Summary: How to Use the Principle of Least Privilege with Predefined IAM Roles in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud predefined, basic, and custom roles
- IAM Recommender / Policy Intelligence
- Google Cloud CLI (`gcloud`)
- Cloud Storage IAM
- Cloud Run IAM
- Cloud SQL IAM
- Memorystore for Redis IAM
- Pub/Sub IAM
- Service accounts

## Sources Consulted
- Google Cloud IAM roles overview: https://docs.cloud.google.com/iam/docs/roles-overview
- Google Cloud predefined role selection guidance: https://cloud.google.com/iam/docs/choose-predefined-roles
- Google Cloud IAM Recommender role recommendations: https://docs.cloud.google.com/policy-intelligence/docs/review-apply-role-recommendations
- Google Cloud Recommender CLI reference: https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/mark-claimed
- Google Cloud Policy Intelligence activity analyzer: https://docs.cloud.google.com/policy-intelligence/docs/activity-analyzer-service-account-authentication
- Google Cloud Policy Intelligence CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/policy-intelligence/query-activity
- Google Cloud project IAM binding CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud Storage IAM roles: https://docs.cloud.google.com/storage/docs/access-control/iam-roles
- Google Cloud Storage bucket IAM CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/add-iam-policy-binding
- Google Cloud Pub/Sub topic IAM CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/add-iam-policy-binding
- Google Cloud Run IAM roles and deployment permissions: https://docs.cloud.google.com/run/docs/reference/iam/roles
- Google Cloud SQL IAM roles: https://docs.cloud.google.com/iam/docs/roles-permissions/cloudsql
- Google Cloud Memorystore for Redis IAM roles: https://docs.cloud.google.com/iam/docs/roles-permissions/redis
- Google Cloud Error Reporting IAM roles: https://docs.cloud.google.com/iam/docs/roles-permissions/errorreporting
- Google Cloud CLI formatting reference: https://cloud.google.com/sdk/gcloud/reference/topic/formats

## Issues Found
- The post described `gcloud recommender recommendations mark-claimed` as applying a recommendation. This command only marks the recommendation as claimed and freezes recommendation updates while the user applies the policy change separately. Updated the text and command comment to say "claim" and added a sentence explaining that the IAM allow policy must be updated before marking the recommendation succeeded.
- The Cloud Run developer role set omitted supporting deployment permissions. Added `roles/artifactregistry.reader` on the Artifact Registry repository and a resource-scoped `roles/iam.serviceAccountUser` grant on the Cloud Run service identity.
- The frontend service account example said the account needed to write logs but did not grant a log-writing role. Added `roles/logging.logWriter`.
- The bucket-level IAM example used `gsutil iam ch`. While still seen in older examples, current Google Cloud CLI documentation recommends `gcloud storage buckets add-iam-policy-binding` for bucket IAM bindings. Replaced the example with the current `gcloud storage` command and full predefined role name.
- The service account review example claimed that `gcloud iam service-accounts list` shows last authentication time, but that command only lists service account metadata such as email, display name, and disabled state. Updated the command comment.
- The Policy Intelligence example used `serviceAccountKeyLastAuthentication` while the surrounding text discussed unused service accounts. Changed it to `serviceAccountLastAuthentication`; the key-specific activity type is for service account keys.

## Review Notes
The job-function role sets are intentionally illustrative. In production, Redis IAM roles govern Memorystore resource access rather than arbitrary Redis data-plane authorization.

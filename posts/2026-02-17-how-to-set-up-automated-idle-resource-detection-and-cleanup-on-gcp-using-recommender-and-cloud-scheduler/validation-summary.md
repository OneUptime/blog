# Validation Summary: How to Set Up Automated Idle Resource Detection and Cleanup on GCP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Recommender API
- Compute Engine idle resource and machine type recommenders
- Cloud Functions / Cloud Run functions
- Cloud Scheduler HTTP targets with OIDC authentication
- Google Cloud IAM roles
- Google Cloud Python client libraries
- BigQuery SQL
- Slack incoming webhooks

## Sources Consulted
- Google Cloud Recommender IDs: https://docs.cloud.google.com/recommender/docs/recommenders
- Compute Engine idle resource recommendations: https://docs.cloud.google.com/compute/docs/viewing-and-applying-idle-resources-recommendations
- gcloud recommender recommendations list reference: https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/list
- gcloud functions deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Run functions authenticated invocation: https://docs.cloud.google.com/functions/docs/securing/authenticating
- Cloud Scheduler authenticated HTTP targets: https://docs.cloud.google.com/scheduler/docs/http-target-auth
- gcloud scheduler jobs create http reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Recommender Python client state and mark claimed docs: https://cloud.google.com/python/docs/reference/recommender/latest/google.cloud.recommender_v1.types.RecommendationStateInfo.State and https://cloud.google.com/python/docs/reference/recommender/latest/google.cloud.recommender_v1.types.MarkRecommendationClaimedRequest
- Compute Engine Python client disk snapshot docs: https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.disks.DisksClient
- Google Cloud IAM roles for Recommender and Compute Engine: https://docs.cloud.google.com/iam/docs/roles-permissions/recommender and https://cloud.google.com/iam/docs/roles-permissions/compute

## Issues Found
- The post listed "unattached snapshots past their retention period" as a Recommender category. Google Cloud documents idle custom images, disks, IPs, VMs, reservations, and other recommenders, but not that snapshot category. Changed the bullet to "Idle custom images."
- The API enablement commands omitted services required by the deployment and schedule flow. Added Cloud Functions, Cloud Build, and Cloud Scheduler APIs.
- The manual IP recommendation example only showed regional IPs. Google Cloud documents regional and global idle IP recommendations, so a global example was added.
- The cleanup code defined `MIN_IDLE_DAYS` but never enforced it. Removed the unused setting because Recommender determines the idle recommendation eligibility.
- The code extracted resource names from every recommendation operation with a matching resource type. Disk recommendations can include both snapshot creation and disk removal operations with the same documented resource type, so the code now only extracts names from `remove` operations.
- The disk cleanup code created a snapshot and immediately deleted the disk without waiting for the snapshot operation to finish. Updated it to use `DisksClient.create_snapshot()` and wait for `operation.result()` before deleting.
- Disk and IP cleanup actions did not mark their recommendations as claimed. Added `mark_recommendation_claimed()` calls and updated IAM from viewer to Compute Recommender Admin because updating recommendation state requires update permissions.
- The IP cleanup code hard-coded a small region list and did not handle global addresses. Updated it to enumerate regions and process global address recommendations.
- The IAM grants omitted permissions needed to delete static IP addresses and invoke a private second-generation function from Cloud Scheduler. Added Compute Network Admin for address deletion and a `roles/run.invoker` binding on the function.
- The deployment instructions deployed the function before creating the service account it referenced. Reordered the commands so the service account and IAM bindings are created first.
- The Cloud Scheduler command omitted an explicit location. Added `--location=us-central1` to match the function region and the gcloud command reference.
- The right-sizing report snippet referenced `compute_v1`, `PROJECT_ID`, and `send_slack()` without defining them. Added the missing import, constants, and helper.

## Review Notes
The examples are still intentionally broad and use project-level roles for readability. For production, a custom least-privilege role and separate service accounts for function execution and Scheduler invocation would be safer.

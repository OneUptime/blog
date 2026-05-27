# Validation Summary: How to View Release Differences and Audit History in Cloud Deploy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Deploy
- Google Cloud CLI (`gcloud deploy`, `gcloud logging`, `gcloud pubsub`, `gcloud storage`)
- Cloud Audit Logs
- Cloud Logging sinks
- Pub/Sub notifications
- BigQuery log exports
- Kubernetes rendered manifests
- Skaffold

## Sources Consulted
- Google Cloud CLI reference: `gcloud deploy releases list` - https://docs.cloud.google.com/sdk/gcloud/reference/deploy/releases/list
- Google Cloud CLI reference: `gcloud deploy releases describe` - https://docs.cloud.google.com/sdk/gcloud/reference/deploy/releases/describe
- Google Cloud CLI reference: `gcloud deploy rollouts list` - https://docs.cloud.google.com/sdk/gcloud/reference/deploy/rollouts/list
- Cloud Deploy REST API: Release resource, `targetArtifacts`, and `targetRenders` - https://docs.cloud.google.com/deploy/docs/api/reference/rest/v1/projects.locations.deliveryPipelines.releases
- Cloud Deploy REST API: Rollout resource, approval fields, rollout states, and deploy timestamps - https://docs.cloud.google.com/deploy/docs/api/reference/rest/v1/projects.locations.deliveryPipelines.releases.rollouts
- Cloud Deploy audit logging - https://docs.cloud.google.com/deploy/docs/audit-logs
- Cloud Deploy Pub/Sub notifications - https://docs.cloud.google.com/deploy/docs/subscribe-deploy-notifications
- Cloud Logging platform logs for Cloud Deploy resource types - https://docs.cloud.google.com/logging/docs/api/platform-logs
- Google Cloud CLI filter syntax and ISO 8601 duration examples - https://cloud.google.com/sdk/gcloud/reference/topic/filters

## Issues Found
- The rendered manifest examples used `targetRenders`, but the Cloud Deploy API defines `targetRenders` as render operation metadata, not the manifest artifact. Updated the examples to read `targetArtifacts.<target>.artifactUri` and `targetArtifacts.<target>.manifestPath`, then fetch the manifest with `gcloud storage cat`.
- The release comparison examples diffed `targetRenders` metadata instead of rendered Kubernetes manifests. Updated them to download the two rendered manifest files from the target artifact location before running `diff`.
- The rollout history section claimed rollouts could be listed across a pipeline without a release. The `gcloud deploy rollouts list` command requires `--release`, so the example now loops over recent releases and lists rollouts for each one.
- The post said rollout details include the approver. The Rollout resource includes approval state and approval time, but the approving principal is found in Cloud Audit Logs. Updated the text and commands accordingly.
- The audit log filters used partial method-name matches such as `ApproveRollout` and an invalid broad method prefix. Updated them to use `protoPayload.serviceName="clouddeploy.googleapis.com"` and full method names such as `google.cloud.deploy.v1.CloudDeploy.ApproveRollout`.
- The Pub/Sub notification example subscribed to `clouddeploy-operations` without creating the topic and implied approval events would arrive there. Updated the example to create the relevant topics and subscribe separately to `clouddeploy-operations` and `clouddeploy-approvals`.
- The release listing examples described "most recent first" without specifying a sort order. Added `--sort-by=~createTime` to make the behavior explicit.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was done against the current official Google Cloud CLI reference and Cloud Deploy API documentation.

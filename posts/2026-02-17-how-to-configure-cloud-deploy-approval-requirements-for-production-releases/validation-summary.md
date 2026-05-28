# Validation Summary: How to Configure Cloud Deploy Approval Requirements for Production Releases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Deploy
- Google Cloud SDK / gcloud CLI
- Google Cloud IAM
- Google Pub/Sub
- Google Kubernetes Engine
- Cloud Deploy canary deployments

## Sources Consulted
- Google Cloud Deploy: Promote your release and manage approvals: https://docs.cloud.google.com/deploy/docs/promote-release
- Google Cloud Deploy: Configuration schema reference: https://docs.cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy: Using Cloud Deploy notifications: https://docs.cloud.google.com/deploy/docs/subscribe-deploy-notifications
- Google Cloud Deploy: Manage rollouts: https://cloud.google.com/deploy/docs/deployment-strategies/manage-rollout
- Google Cloud Deploy: Canary-deploy an application to a target: https://docs.cloud.google.com/deploy/docs/deploy-app-canary
- Google Cloud Deploy: Using automation rules: https://docs.cloud.google.com/deploy/docs/automation-rules
- Google Cloud IAM: Cloud Deploy roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/clouddeploy
- Google Cloud SDK: gcloud deploy rollouts approve: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/rollouts/approve
- Google Cloud SDK: gcloud deploy rollouts reject: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/rollouts/reject
- Google Cloud SDK: gcloud topic filters and datetimes: https://docs.cloud.google.com/sdk/gcloud/reference/topic/filters and https://docs.cloud.google.com/sdk/gcloud/reference/topic/datetimes

## Issues Found
- The post said only users with `clouddeploy.approver` can approve or reject rollouts. Updated this to the exact predefined role name `roles/clouddeploy.approver` and noted that equivalent permissions also work.
- The post said approval notifications are published to `clouddeploy-operations`. Updated this to `clouddeploy-approvals`, which is the documented topic for approval-required, approved, and rejected events.
- The Pub/Sub subscription filter used `attributes.ResourceType="Rollout"`, but documented approval notification examples include approval-specific attributes such as `Action`, `Rollout`, `ReleaseId`, `RolloutId`, and `TargetId`, not `ResourceType`. Updated the filter to `attributes.Action="Required"`.
- The notification example assumed the topic already existed. Added the documented `gcloud pubsub topics create clouddeploy-approvals` command before creating the subscription.
- The approval section said Cloud Deploy begins by rendering manifests after approval. Adjusted this because Cloud Deploy releases include rendered target artifacts; approval unblocks deployment and verification work.
- The console section mentioned a notes text field, which I could not verify in the official approval workflow documentation. Removed that unsupported detail while preserving the console approval guidance.
- The multiple-target section referred to Cloud Deploy automation auto-approving staging. Built-in Cloud Deploy automation rules cover promotion, scheduled promotion, phase advancement, and rollout repair, not approval decisions. Changed this to "custom approval integration."

## Review Notes
The remaining Cloud Deploy target YAML, canary strategy shape, rollout approve/reject commands, promotion command, IAM binding examples, rollout states, and gcloud datetime filter syntax are consistent with current official documentation. The local environment did not have `gcloud` installed, so CLI verification used official Google Cloud SDK reference pages instead of local `--help` output.

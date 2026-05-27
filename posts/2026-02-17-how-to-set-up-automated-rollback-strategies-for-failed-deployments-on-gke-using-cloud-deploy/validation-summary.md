# Validation Summary: How to Set Up Automated Rollback Strategies for Failed Deployments

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Kubernetes Engine
- Kubernetes Deployments, probes, and rollout rollback
- Google Cloud Deploy delivery pipelines, canary deployments, verification, rollback, and automation
- Skaffold verification
- Google Cloud Monitoring alerting policies and Pub/Sub notification channels
- Google Cloud Functions with Pub/Sub triggers
- gcloud CLI and kubectl commands

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Google Cloud Deploy verification documentation: https://docs.cloud.google.com/deploy/docs/verify-deployment
- Google Cloud Deploy configuration schema reference: https://docs.cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy automation overview: https://docs.cloud.google.com/deploy/docs/automation
- Google Cloud Deploy automation rules: https://docs.cloud.google.com/deploy/docs/automation-rules
- Google Cloud Deploy rollback documentation: https://docs.cloud.google.com/deploy/docs/roll-back
- Google Cloud Deploy rollbackTarget API reference: https://docs.cloud.google.com/deploy/docs/api/reference/rest/v1/projects.locations.deliveryPipelines/rollbackTarget
- gcloud deploy targets rollback reference: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/targets/rollback
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring notification channels API documentation: https://docs.cloud.google.com/monitoring/alerts/using-channels-api

## Issues Found
- Removed the manually set `deployment.kubernetes.io/revision` annotation. Kubernetes manages Deployment revision annotations; users should configure rollback retention with `revisionHistoryLimit`.
- Corrected the `maxUnavailable: 0` explanation. With 5 replicas and zero unavailable pods, the intended availability is all 5 existing pods during the rolling update, not 4.
- Narrowed the `progressDeadlineSeconds` explanation. Kubernetes marks a rollout failed when progress stalls; it does not itself perform rollback.
- Updated Cloud Deploy rollback behavior. Verification failure marks the rollout failed; automatic rollback requires a Cloud Deploy `Automation` with a `repairRolloutRule`.
- Replaced the unsupported standalone Kubernetes Job verification annotation with a Skaffold `verify` configuration, which is how Cloud Deploy deployment verification is configured.
- Replaced the metrics rollback controller's invalid rollout listing and local `kubectl`/`gcloud` subprocess rollback with the Cloud Deploy `rollback_target` client API.
- Fixed Pub/Sub alert decoding for a background Cloud Function by base64-decoding `event["data"]`.
- Corrected Cloud Monitoring alert commands to use current `gcloud monitoring policies create` flags: `--if` and `--duration`.
- Added the missing Pub/Sub notification channel configuration and IAM binding needed for Cloud Monitoring to publish to the topic.
- Corrected the Cloud Deploy specific-release rollback command by adding `--to-target=production`.
- Fixed the post-rollback pod readiness check to use `.status.readyReplicas` instead of counting pods in the `Running` phase.

## Review Notes
The examples still use placeholder project IDs, metric names, service account names, channel IDs, and project numbers that must be replaced in a real deployment. The local environment did not have `gcloud` or `kubectl` installed, so CLI validation was performed against official command reference documentation rather than local `--help` output.

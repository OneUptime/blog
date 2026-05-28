# Validation Summary: How to Configure Automated Rollbacks in Cloud Deploy When Verification Fails

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Deploy
- Cloud Deploy deployment verification
- Cloud Deploy automation rules and rollback repair
- Skaffold verification
- Google Cloud CLI
- Pub/Sub notifications
- Docker
- Shell scripting

## Sources Consulted
- Google Cloud Deploy: Verify your deployment: https://docs.cloud.google.com/deploy/docs/verify-deployment
- Google Cloud Deploy: Configuration file schema: https://docs.cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy: Automate your deployment: https://docs.cloud.google.com/deploy/docs/automation
- Google Cloud Deploy: Using automation rules: https://docs.cloud.google.com/deploy/docs/automation-rules
- Google Cloud Deploy: Cloud Deploy service accounts: https://docs.cloud.google.com/deploy/docs/cloud-deploy-service-account
- Google Cloud Deploy: Using Cloud Deploy notifications: https://docs.cloud.google.com/deploy/docs/subscribe-deploy-notifications
- Google Cloud SDK: gcloud deploy releases create: https://cloud.google.com/sdk/gcloud/reference/deploy/releases/create
- Google Cloud SDK: gcloud deploy rollouts list: https://cloud.google.com/sdk/gcloud/reference/deploy/rollouts/list
- Skaffold verify documentation: https://skaffold.dev/docs/verify/
- Skaffold v4beta7 schema reference: https://pkg.go.dev/github.com/GoogleContainerTools/skaffold/v2/pkg/skaffold/schema/v4beta7

## Issues Found
- The automation example used a non-existent `rollbackRule` rule type, a `name` field under the rule, an invalid top-level `deliveryPipeline` field, and an incorrectly shaped `selector`. Updated it to the documented `repairRolloutRule` schema, used `id`, scoped it to the delivery pipeline through `metadata.name`, and configured rollback through `repairPhases`.
- The introductory rollback flow implied Cloud Deploy rolls back directly when verification fails. Clarified that verification failure fails the rollout, and the configured automation performs the rollback.
- The Skaffold verification example used `timeout: 300s`, but the v4beta7 schema expects the timeout as an integer number of seconds. Changed it to `timeout: 300`.
- The verification Dockerfile used `curlimages/curl:latest`, but the smoke-test script also requires `python3` and `bc`. Changed the image to Alpine and installed `curl`, `python3`, and `bc`.
- The automation service account instructions omitted impersonation of the Cloud Deploy execution service account. Added a `roles/iam.serviceAccountUser` binding example for the execution service account.
- The Pub/Sub notification example created only a subscription. Cloud Deploy notification topics must be created before subscribing, so added `gcloud pubsub topics create clouddeploy-operations`.

## Review Notes
The examples use placeholder project IDs, service names, image names, and service account names, which is appropriate for a tutorial. For GKE in-cluster verification, the service URL shown is valid only when the verification container runs with network access to the cluster service; otherwise users should use a reachable endpoint or configure Skaffold `executionMode.kubernetesCluster`.

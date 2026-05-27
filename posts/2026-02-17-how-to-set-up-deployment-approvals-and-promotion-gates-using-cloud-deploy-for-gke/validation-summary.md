# Validation Summary: How to Set Up Deployment Approvals and Promotion Gates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Deploy
- Google Kubernetes Engine
- Skaffold
- Cloud Build
- Google Cloud IAM
- Pub/Sub
- Cloud Functions
- Kubernetes manifests and rollout verification

## Sources Consulted
- Google Cloud Deploy configuration schema reference: https://cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy promote releases and manage approvals: https://cloud.google.com/deploy/docs/promote-release
- Google Cloud Deploy deployment verification: https://cloud.google.com/deploy/docs/verify-deployment
- Google Cloud Deploy deploy hooks: https://cloud.google.com/deploy/docs/hooks
- Google Cloud Deploy service notifications: https://cloud.google.com/deploy/docs/subscribe-deploy-notifications
- Google Cloud Deploy rollback documentation: https://cloud.google.com/deploy/docs/roll-back
- Google Cloud Deploy service accounts: https://cloud.google.com/deploy/docs/cloud-deploy-service-account
- gcloud deploy releases create reference: https://cloud.google.com/sdk/gcloud/reference/deploy/releases/create
- gcloud deploy rollouts approve reference: https://cloud.google.com/sdk/gcloud/reference/deploy/rollouts/approve
- Skaffold Kustomize renderer documentation: https://skaffold.dev/docs/renderers/kustomize/
- Skaffold verification documentation: https://skaffold.dev/docs/verify/
- Skaffold custom actions documentation: https://skaffold.dev/docs/custom-actions/

## Issues Found
- The post described "automated rollback" and showed an invalid `gcloud deploy rollouts create` rollback command. Updated the description and rollback section to use `gcloud deploy targets rollback`, including the documented `--release` and `--rollout-id` options for selecting a rollback release.
- The architecture diagram labeled dev-to-staging as auto-promotion, but the tutorial does not configure a Cloud Deploy automation rule. Changed the label to manual promotion.
- The target snippets said each target represented a cluster and namespace, but Cloud Deploy targets identify the runtime target; namespaces come from rendered Kubernetes manifests. Clarified that wording.
- The target `executionConfigs` only listed `RENDER` and `DEPLOY` while the pipeline enables verification and production hooks. Added `VERIFY` for dev and staging, and `PREDEPLOY`, `VERIFY`, and `POSTDEPLOY` for production.
- The production pipeline referenced predeploy and postdeploy actions that were not defined in `skaffold.yaml`. Added matching `customActions` entries.
- The production smoke test used a cluster-local service DNS name from a verification container. Added Kubernetes cluster execution mode so the check runs inside the target cluster.
- The Cloud Deploy service agent principal was missing the required `service-` prefix. Corrected it to `service-PROJECT_NUMBER@gcp-sa-clouddeploy.iam.gserviceaccount.com`.
- The custom execution service account was missing the Cloud Deploy Runner role. Added `roles/clouddeploy.jobRunner`.
- The Cloud Build release step would need the build service account to create releases and act as the Cloud Deploy execution service account. Added the required IAM bindings.
- The Pub/Sub notification setup implied Cloud Deploy automatically creates the `clouddeploy-approvals` topic. Updated the commands to create the topic before creating a subscription.
- The Cloud Function sample checked a nonexistent JSON `approvalState` payload and used an undefined `SLACK_WEBHOOK_URL` variable. Updated it to read Cloud Deploy Pub/Sub attributes (`Action`, `DeliveryPipelineId`, `ReleaseId`, `RolloutId`) and to read the Slack webhook from an environment variable with a request timeout.

## Review Notes
The `gcloud` CLI is not installed in this local environment, so CLI verification was performed against official Google Cloud SDK reference pages instead of local `--help` output. YAML snippets were parsed locally with PyYAML after edits.

# Validation Summary: How to Add Verification Steps to Cloud Deploy Releases to Validate Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Deploy
- Skaffold
- Google Kubernetes Engine
- Cloud Build
- Docker
- Shell scripting
- Artifact Registry

## Sources Consulted
- Google Cloud Deploy deployment verification documentation: https://docs.cloud.google.com/deploy/docs/verify-deployment
- Google Cloud Deploy configuration schema reference: https://docs.cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy GKE canary deployment documentation: https://docs.cloud.google.com/deploy/docs/deployment-strategies/canary/gke/service-networking
- Google Cloud Deploy verification quickstart: https://docs.cloud.google.com/deploy/docs/deploy-app-verification
- Skaffold verification documentation: https://skaffold.dev/docs/verify/
- Google Cloud SDK reference for `gcloud deploy rollouts describe`: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/rollouts/describe
- Google Cloud SDK reference for `gcloud builds log`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/log
- Google Cloud Build build results and filtering documentation: https://docs.cloud.google.com/build/docs/view-build-results

## Issues Found
- The post described verification as only a boolean flag. Current Cloud Deploy supports `verify: true` for Skaffold-based verification and also supports task-based verification. Updated the wording to clarify that the boolean example applies when using Skaffold `verify`.
- The Skaffold verification example used an in-cluster Kubernetes DNS name but did not configure in-cluster execution. Added `executionMode.kubernetesCluster: {}` so the verification container can resolve cluster DNS.
- The Skaffold `timeout` examples used duration strings such as `600s`. Skaffold verify timeout is configured as seconds, so these were changed to integer values.
- The post stated multiple Skaffold verification containers run sequentially. Skaffold runs multiple verify containers in parallel, and all must succeed. Updated the explanation.
- The log viewing section implied the recommended workflow was listing Cloud Build jobs by assumed tags. Replaced that with Cloud Deploy rollout details guidance and kept `gcloud builds log BUILD_ID` for cases where the build ID is known.
- The rollout status text used non-current example states such as `DEPLOYING`, `DEPLOYED`, and `VERIFYING`. Updated it to refer to rollout, phase, job, and job-run states such as `IN_PROGRESS`, `SUCCEEDED`, and `FAILED`.
- The canary section described GKE service-networking canary percentages as traffic percentages and said verification runs against canary pods. Updated the wording to explain that GKE service networking approximates percentages by pod counts and that Gateway API should be used for traffic-based splitting.
- The summary implied automated rollbacks were part of the configuration shown. Updated it to say verification can be combined with rollout repair or rollback automation.

## Review Notes
The local environment did not have the `gcloud` or `skaffold` CLIs installed, so command and schema validation was performed against official Google Cloud and Skaffold documentation instead of local `--help` output.

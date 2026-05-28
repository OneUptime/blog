# Validation Summary: How to Use CI/CD for Terraform GCP Deployments Using Cloud Build

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Terraform
- Google Cloud Storage
- Google Cloud IAM
- Google Cloud CLI
- gsutil
- GitHub REST API
- YAML
- Python

## Sources Consulted
- Google Cloud Build trigger documentation: https://docs.cloud.google.com/build/docs/automating-builds/create-manage-triggers
- Google Cloud Build trigger CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Build manual trigger CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/beta/builds/triggers/create/manual
- Google Cloud Build trigger run CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/run
- Google Cloud Build approval gates: https://docs.cloud.google.com/build/docs/securing-builds/gate-builds-on-approval
- Google Cloud Build substitutions: https://docs.cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build config schema and artifacts: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build Secret Manager integration: https://docs.cloud.google.com/build/docs/securing-builds/use-secrets
- Cloud Build service account changes: https://docs.cloud.google.com/build/docs/cloud-build-service-account-updates
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- Terraform releases: https://github.com/hashicorp/terraform/releases
- GitHub REST API issue comments: https://docs.github.com/en/rest/issues/comments

## Issues Found
- The post used the legacy Cloud Build service account address as if it were always the default. Google changed Cloud Build default service account behavior in 2024, and triggers may require an explicit service account. Updated the commands to create and use a user-specified service account.
- The examples pinned Terraform to `hashicorp/terraform:1.7`, which is old for a 2026 tutorial. Updated the examples to `hashicorp/terraform:1.15`, the current Terraform 1.x series at review time.
- The apply trigger was configured as an automatic merge-to-main trigger while `apply.yaml` required `_PLAN_BUILD_ID`. That trigger would not know which reviewed plan artifact to apply. Changed it to a manual apply trigger and added the `gcloud builds triggers run` command with `_PLAN_BUILD_ID`.
- The apply pipeline could run with an empty `_PLAN_BUILD_ID`, causing a bad Cloud Storage path. Added an early check that fails clearly if the approved plan build ID is missing.
- The PR comment step built JSON with shell string interpolation, which would break on quotes, backslashes, or multiline plan output. Replaced it with a Python JSON-encoding implementation that uses Cloud Build's GitHub PR substitutions.
- The destructive-change check assumed `python3` existed in the `hashicorp/terraform` image. Split the step so Terraform exports JSON and `python:3.12-alpine` parses it.
- The multi-environment apply examples reused automatic GitHub triggers even though the apply config requires a reviewed plan build ID. Changed them to manual triggers that accept `_PLAN_BUILD_ID`.
- The wrap-up still described the workflow as apply-on-merge. Updated it to "approved-apply" to match the corrected saved-plan workflow.

## Review Notes
The examples still grant broad IAM roles for brevity. For production, narrow the service account permissions to the specific resources Terraform manages and restrict access to saved plan artifacts because Terraform plan files can contain sensitive values.

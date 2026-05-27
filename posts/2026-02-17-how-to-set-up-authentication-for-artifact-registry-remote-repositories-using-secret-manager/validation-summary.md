# Validation Summary: How to Set Up Authentication for Artifact Registry Remote Repositories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Artifact Registry remote repositories
- Google Cloud Secret Manager
- Google Cloud CLI
- Docker authentication for Artifact Registry
- Terraform Google provider
- IAM service agents and Secret Manager Secret Accessor role

## Sources Consulted
- Google Cloud Artifact Registry: Create remote repositories: https://docs.cloud.google.com/artifact-registry/docs/repositories/remote-repo
- Google Cloud Artifact Registry: Configure authentication to remote repository upstreams: https://docs.cloud.google.com/artifact-registry/docs/repositories/configure-remote-authentication
- Google Cloud Secret Manager: Create a secret: https://docs.cloud.google.com/secret-manager/docs/creating-and-accessing-secrets
- Google Cloud SDK reference: `gcloud secrets create`: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Cloud SDK reference: `gcloud secrets versions add`: https://cloud.google.com/sdk/gcloud/reference/secrets/versions/add
- Terraform Google provider: `google_artifact_registry_repository`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository
- Terraform Google provider: `google_secret_manager_secret_version`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_version

## Issues Found
- Corrected the explanation that implied credentials could be passed directly to Artifact Registry. Current Artifact Registry authentication configuration references a Secret Manager secret version for upstream passwords or tokens.
- Corrected the IAM failure behavior. Without Secret Manager access for the Artifact Registry service agent, repository creation can fail during upstream validation, not only later during pulls.
- Corrected the Terraform Secret Manager example to use `secret_data_wo` and `secret_data_wo_version` instead of `secret_data`, because the provider documents that `secret_data` is stored in Terraform state as plain text.
- Replaced the Terraform `docker_repository.custom_repository` block with `remote_repository_config.common_repository`, because the provider documents `custom_repository` as deprecated for custom upstream URLs.
- Adjusted the Secret Manager benefits list so it no longer overstates that the examples keep credentials out of Terraform state or shell history in all cases.

## Review Notes
The gcloud command structure, remote repository flags, Secret Manager IAM role, service agent email pattern, Docker Hub preset, npm custom upstream example, Docker authentication command, and repository update command match current official documentation. The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK references rather than local `--help` output.

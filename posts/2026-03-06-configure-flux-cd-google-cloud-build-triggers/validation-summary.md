# Validation Summary: How to Configure Flux CD with Google Cloud Build Triggers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Google Cloud Build
- Google Artifact Registry
- GKE Workload Identity
- Flux OCIRepository and OCI artifacts
- Flux Receiver webhooks
- Flux image automation
- Flux notification Provider and Alert resources
- Kubernetes manifests and kubectl

## Sources Consulted
- Flux CLI installation documentation: https://fluxcd.io/flux/cmd/
- Flux `push artifact` command reference: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `tag artifact` command reference: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux GCP integration documentation: https://fluxcd.io/flux/integrations/gcp/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Google Cloud Build trigger CLI reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Build substitutions documentation: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build user-specified service account documentation: https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts
- Google Cloud Build builder image documentation: https://cloud.google.com/build/docs/cloud-builders
- Google Cloud Build official builders repository: https://github.com/GoogleCloudPlatform/cloud-builders

## Issues Found
- The Cloud Build example used `flux oci login`, which is not a documented Flux CLI command. Updated the OCI push and tag steps to use `flux push artifact --provider=gcp` and `flux tag artifact --provider=gcp`, which are the documented provider-aware commands for Google Artifact Registry.
- The OCI artifact push used `git config --get remote.origin.url`, which is unreliable in Cloud Build source workspaces. Replaced it with the Cloud Build trigger substitution `$REPO_FULL_NAME` to build a GitHub source URL.
- The Flux CLI install step piped the installer into a default system install path and copied `/usr/local/bin/flux`. Updated it to install directly into `/workspace/bin`, following the documented custom install directory pattern.
- The Cloud Build trigger and IAM examples assumed the legacy project-number Cloud Build service account. Updated them to use a dedicated user-specified service account and added the required `roles/logging.logWriter` grant for `CLOUD_LOGGING_ONLY` logs.
- The Flux notification `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but current Flux Provider and Alert resources use `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.

## Review Notes
- The `images:` block duplicates the explicit Docker push step. This is not invalid, but a future cleanup could choose one push mechanism to avoid redundant pushes.
- The Google Chat webhook URL is shown inline for brevity. Flux supports this, but storing sensitive webhook URLs in a Secret is preferable for production.

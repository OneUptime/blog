# Validation Summary: How to Configure Upstream Sources for Artifact Registry Remote Repositories

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Artifact Registry remote repositories
- Google Cloud CLI
- npm
- Maven
- Python pip
- Debian/Ubuntu Apt repositories
- Yum/RPM repositories
- Terraform Google provider
- Secret Manager
- Artifact Registry cleanup policies

## Sources Consulted
- Google Cloud Artifact Registry remote repository documentation: https://docs.cloud.google.com/artifact-registry/docs/repositories/remote-repo
- Google Cloud SDK reference for `gcloud artifacts repositories create`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud Artifact Registry npm authentication documentation: https://docs.cloud.google.com/artifact-registry/docs/nodejs/authentication
- Google Cloud Artifact Registry Maven and Gradle authentication documentation: https://cloud.google.com/artifact-registry/docs/java/authentication
- Google Cloud Artifact Registry Python package management documentation: https://docs.cloud.google.com/artifact-registry/docs/python/manage-packages
- Google Cloud Artifact Registry cleanup policy documentation: https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
- Terraform `google_artifact_registry_repository` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository

## Issues Found
- The supported upstream list omitted current remote repository formats and described Yum support too broadly as Red Hat and CentOS. Updated the list to include Go and Ruby remote repositories and to describe the documented Yum upstreams as CentOS, Rocky Linux, and EPEL.
- The Apt remote repository command used a full URL with `--remote-apt-repo`, but the Google Cloud CLI expects a supported repository base such as `UBUNTU` plus `--remote-apt-repo-path`. Updated the example to use `--remote-apt-repo=UBUNTU` and `--remote-apt-repo-path="ubuntu/dists/jammy"`.
- The monitoring section claimed that `gcloud artifacts repositories list` checks upstream connectivity and upstream status. The command only lists repositories. Updated the section to describe it as listing remote repositories and verifying configured upstream sources.
- The cleanup policy JSON used `id`, but the documented JSON policy field is `name`. Updated the cleanup policy example accordingly.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so command validation was performed against official Google Cloud CLI reference documentation rather than local `gcloud --help` output.

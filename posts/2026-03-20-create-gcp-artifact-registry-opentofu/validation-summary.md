# Validation Summary: How to Create GCP Artifact Registry with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Google Cloud Platform (GCP)
- GCP Artifact Registry
- Docker / Container Registry
- Maven, npm, PyPI, Helm package formats
- HashiCorp `hashicorp/google` provider (~> 5.0)
- IAM (artifactregistry roles)

## Sources Consulted
- HashiCorp Google provider docs for `google_artifact_registry_repository`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository
- HashiCorp Google provider source (v5.0.0) for `artifact_registry_repository.html.markdown` on GitHub
- HashiCorp Google provider docs for `google_artifact_registry_repository_iam_member`
- GCP Artifact Registry documentation on supported formats, multi-region locations, cleanup policies, and Docker URL format (`{location}-docker.pkg.dev/{project}/{repository}`)

## Issues Found
- **Inaccurate `version_policy` comment in `maven_config`**: The original comment listed valid values as `RELEASE, SNAPSHOT, or NONE`. `NONE` is not a valid value. The correct values per the provider schema are `VERSION_POLICY_UNSPECIFIED`, `RELEASE`, and `SNAPSHOT`. Updated the comment to reflect the actual valid values.

## Review Notes
- Resource names (`google_artifact_registry_repository`, `google_artifact_registry_repository_iam_member`), block structure (`cleanup_policies`, `condition`, `most_recent_versions`, `maven_config`), and field names (`tag_state`, `older_than`, `keep_count`, `allow_snapshot_overwrites`) all match the official provider schema.
- Format values (`DOCKER`, `MAVEN`, `NPM`, `PYTHON`, `HELM`) are all valid per the Artifact Registry API.
- The `older_than = "604800s"` duration string format is correct (seconds with `s` suffix).
- Multi-region locations (`us`, `europe`, `asia`) are valid Artifact Registry multi-region values.
- The Docker registry URL pattern `{location}-docker.pkg.dev/{project}/{repository_id}` is the official format.
- The IAM example references `google_service_account.gke_nodes` and `google_service_account.cicd` resources that are not defined in the post; this is acceptable for a focused tutorial since they are clearly placeholders the reader supplies, but a future revision could note this explicitly.
- `cleanup_policies` was originally documented as a Beta feature in the v5.0 provider; it is now generally available in newer provider versions. Readers using older provider versions may need to enable Beta or upgrade.

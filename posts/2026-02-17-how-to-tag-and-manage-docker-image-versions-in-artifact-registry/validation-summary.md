# Validation Summary: How to Tag and Manage Docker Image Versions in Artifact Registry

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Artifact Registry
- Google Cloud CLI (`gcloud artifacts`)
- Docker image tags and digests
- Cloud Build build configuration
- GKE deployment image references

## Sources Consulted
- Google Cloud SDK reference: `gcloud artifacts docker tags add` - https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/tags/add
- Google Cloud SDK reference: `gcloud artifacts docker tags list` - https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/tags/list
- Google Cloud SDK reference: `gcloud artifacts docker images list` - https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list
- Google Cloud SDK reference: `gcloud artifacts docker images describe` - https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Google Cloud SDK reference: `gcloud artifacts docker images delete` - https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/delete
- Google Cloud SDK reference: `gcloud artifacts repositories create` - https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Artifact Registry documentation: Manage images - https://cloud.google.com/artifact-registry/docs/docker/manage-images
- Artifact Registry documentation: Create standard repositories - https://cloud.google.com/artifact-registry/docs/repositories/create-repos
- Artifact Registry documentation: Repository and image names - https://cloud.google.com/artifact-registry/docs/docker/names
- Cloud Build documentation: Build config file schema - https://cloud.google.com/build/docs/build-config-file-schema
- Cloud Build documentation: Substituting variable values - https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Docker CLI reference: `docker image tag` - https://docs.docker.com/reference/cli/docker/image/tag/

## Issues Found
- The Cloud Build example used `$BRANCH_NAME` directly as a Docker tag. Cloud Build does provide `$BRANCH_NAME` for trigger builds, but branch names can contain characters such as `/` that are not valid in Docker tag names. Changed the example to use a stable channel tag (`dev`) instead.
- The tag deletion comment implied the image remains only when other tags point to it. Artifact Registry tag deletion removes the tag from the image version; the version can remain as an untagged image. Updated the comment to state that the image version remains but may become untagged.
- The deployment workflow promoted mutable environment tags while the best practices also recommended immutable tags for production. Artifact Registry immutable tags cannot be moved to a different digest. Added a caveat that environment-tag promotion is for intentionally mutable repositories, and immutable repositories should deploy by digest or unique release tag.
- The immutable-tags best practice did not mention that tags such as `production` cannot be moved when immutable tags are enabled. Updated the wording to clarify this limitation.

## Review Notes
Most commands and examples matched current official Google Cloud CLI documentation. The `gcloud artifacts docker images delete` examples are valid, but deleting a tagged digest or a tag whose digest has other tags can require `--delete-tags`; the post's examples remain acceptable as simple cases.

# Validation Summary: How to Migrate Docker Images from Google Container Registry to Artifact Registry

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Artifact Registry
- Google Container Registry
- Google Cloud CLI
- Docker
- gcrane / go-containerregistry
- Google Cloud IAM
- Artifact Registry cleanup policies

## Sources Consulted
- Google Cloud Artifact Registry transition guide: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud guide for copying images from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/docker/copy-from-gcr
- Google Cloud Artifact Registry Docker authentication guide: https://docs.cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud Artifact Registry repository and image names: https://docs.cloud.google.com/artifact-registry/docs/docker/names
- Google Cloud Artifact Registry image management guide: https://docs.cloud.google.com/artifact-registry/docs/docker/manage-images
- Google Cloud Artifact Registry cleanup policy guide: https://docs.cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
- Google Cloud Artifact Registry IAM access control guide: https://docs.cloud.google.com/artifact-registry/docs/access-control
- Google Cloud SDK reference for `gcloud artifacts docker images list`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list
- go-containerregistry `gcrane` README: https://github.com/google/go-containerregistry/blob/main/cmd/gcrane/README.md

## Issues Found
- The post described Container Registry as "being deprecated" and referred to a future deprecation deadline. Google Cloud documentation states that Container Registry is deprecated and, effective March 18, 2025, writing images to Container Registry is unavailable. Updated the description, introduction, and summary to reflect the current state.
- The gcrane example claimed to copy a single image with all tags using `gcrane cp` without recursive mode. Updated the command to `gcrane cp -r`, matching Google Cloud's documented recursive copy pattern for copying image paths and tags from Container Registry.
- The post referred to a gcrane "copy-repo command"; the documented command is recursive copy with `gcrane cp -r`. Updated the wording.
- The cleanup policy command omitted `--no-dry-run`, even though the surrounding text says the policy deletes images. Added `--no-dry-run` to make the command actively apply deletion instead of leaving dry run enabled.
- The cleanup policy used `2592000s` for 30 days. Artifact Registry documentation shows duration values such as `30d` and supports `s`, `m`, `h`, and `d`; changed the example to `30d` for clarity and consistency with official examples.

## Review Notes
- `gcloud` is not installed in this environment, so CLI checks were performed against current official Google Cloud SDK and Artifact Registry documentation rather than local `--help` output.
- Google Cloud recommends the automatic migration tool for many Container Registry migrations, while this post focuses on manual migration to `pkg.dev` repositories with gcrane and Docker. That is technically valid, but readers with large migrations should also evaluate the automatic migration tooling.

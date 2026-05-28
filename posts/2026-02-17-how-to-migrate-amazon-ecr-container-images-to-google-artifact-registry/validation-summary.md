# Validation Summary: How to Migrate Amazon ECR Container Images to Google Artifact Registry

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Artifact Registry
- Amazon Elastic Container Registry
- go-containerregistry crane
- Terraform Google provider
- AWS CLI
- Google Cloud CLI
- Boto3 for Python
- Google Cloud Build
- Kubernetes manifests

## Sources Consulted
- Google Artifact Registry Docker repository and image names: https://docs.cloud.google.com/artifact-registry/docs/docker/names
- Google Artifact Registry Docker authentication: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Artifact Registry repository creation with Terraform: https://cloud.google.com/artifact-registry/docs/repositories/create-repos
- Terraform `google_artifact_registry_repository` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository
- go-containerregistry crane command documentation: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane.md
- AWS CLI ECR examples for `get-login-password`: https://docs.aws.amazon.com/cli/latest/userguide/cli_ecr_code_examples.html
- AWS CLI Linux installation documentation: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- Boto3 ECR `describe_images` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ecr/client/describe_images.html
- Google Cloud Build configuration schema and build step documentation: https://docs.cloud.google.com/build/docs/build-config-file-schema

## Issues Found
- The placeholder ECR registry account ID used 9 digits. AWS account IDs are 12 digits, so the examples now use `123456789012`.
- The direct crane binary download extracted `crane` but did not place it on `PATH` before running `crane version`. Added `sudo install crane /usr/local/bin/crane`.
- The verification script did not verify untagged images, even though the migration script copies untagged images by digest. Added digest-based verification for untagged inventory entries.
- The manifest update command used `sed -i ''`, which is BSD/macOS-specific and fails on common GNU/Linux sed. Replaced it with a `perl -pi -e` command for a more portable one-liner.
- The ongoing sync example used the Cloud SDK container but assumed the AWS CLI was already installed. Added AWS CLI installation steps, including `unzip`, before calling `aws ecr get-login-password`.
- The ongoing sync text called the example a Cloud Build trigger even though the YAML is a build configuration and does not define trigger behavior by itself. Updated the wording to "Cloud Build job."

## Review Notes
- The Terraform cleanup policy structure, Artifact Registry image naming format, `gcloud auth configure-docker` usage, ECR inventory logic with Boto3 paginators, and `crane copy` / `crane digest` usage are consistent with current official documentation.
- The examples still assume the reader supplies appropriate AWS credentials, Google Cloud IAM permissions, enabled Artifact Registry API, and real project, region, repository, and account values.

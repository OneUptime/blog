# Validation Summary: How to Fix 'Container Registry' Push Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker CLI and Docker Engine
- Google Container Registry and Artifact Registry
- Amazon Elastic Container Registry
- Azure Container Registry
- AWS CLI and Azure CLI
- Google Cloud CLI
- Terraform AWS provider
- GitHub Actions

## Sources Consulted
- Google Cloud Artifact Registry documentation: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud Artifact Registry Docker authentication documentation: https://docs.cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud `gcloud auth configure-docker` reference: https://docs.cloud.google.com/sdk/gcloud/reference/auth/configure-docker
- AWS ECR private registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS CLI `ecr get-login-password` reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- AWS CLI `ecr create-repository` reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/create-repository.html
- AWS ECR image scanning documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- Azure Container Registry authentication documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Azure Container Registry service principal authentication documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal
- Docker daemon proxy configuration documentation: https://docs.docker.com/engine/daemon/proxy/
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/
- Terraform AWS provider `aws_ecr_registry_scanning_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_registry_scanning_configuration

## Issues Found
- Google Container Registry was presented as an active target for new pushes. Updated the Google section to explain that Container Registry is shut down for writes and that new pushes should use Artifact Registry, while preserving the `gcr.io` guidance for Artifact Registry-backed repositories.
- The Google service account example granted `roles/storage.admin`, which matches legacy GCR's Cloud Storage-backed model but is not the current Artifact Registry push role. Changed it to `roles/artifactregistry.writer` and updated the Docker login host to an Artifact Registry hostname.
- The ECR repository creation examples used repository-level `image-scanning-configuration scanOnPush=true`. AWS now marks repository-level scanning configuration as deprecated in favor of registry-level scanning configuration. Updated the AWS CLI and Terraform examples to use registry-level scan-on-push configuration.
- The Docker proxy setup used `sudo cat > file`, which does not run the shell redirection with elevated privileges. Replaced it with `sudo tee ... > /dev/null`.
- The Docker debug push example used `docker push ... --debug`, but `--debug` is a global Docker CLI flag, not a `docker push` flag. Changed it to `docker --debug push ...` and made the same correction in the debugging script.
- The optimized Dockerfile claimed to copy only production dependencies but copied the builder stage's full `node_modules`, including development dependencies. Updated the runtime stage to run `npm ci --omit=dev` before copying the build output.
- The debugging script attempted to verify authentication by pulling `library/alpine` from any registry, which is not valid for ECR, ACR, or most private registries. Replaced it with a Docker config credential-helper/auth entry check.

## Review Notes
The GitHub Actions example remains valid for `gcr.io` repositories only when those repositories are backed by Artifact Registry. For new Google Cloud examples, a future revision could switch the default registry to `LOCATION-docker.pkg.dev` throughout.

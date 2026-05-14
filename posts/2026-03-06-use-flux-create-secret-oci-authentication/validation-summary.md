# Validation Summary: How to Use flux create secret oci for OCI Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux source-controller
- Flux OCIRepository
- Kubernetes Secrets
- OCI registries
- Docker Hub
- GitHub Container Registry
- AWS Elastic Container Registry
- Google Artifact Registry
- Azure Container Registry
- GitLab Container Registry
- SOPS

## Sources Consulted
- Flux CLI documentation for `flux create secret oci`: https://fluxcd.io/flux/cmd/flux_create_secret_oci/
- Flux CLI documentation for `flux create source oci`: https://fluxcd.io/flux/cmd/flux_create_source_oci/
- Flux CLI documentation for `flux create kustomization`: https://fluxcd.io/flux/cmd/flux_create_kustomization/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux AWS integration documentation: https://fluxcd.io/flux/integrations/aws/
- Flux GCP integration documentation: https://fluxcd.io/flux/integrations/gcp/
- Flux Azure integration documentation: https://fluxcd.io/flux/integrations/azure/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes private registry Secret documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Docker Hub access token documentation: https://docs.docker.com/docker-hub/access-tokens/
- AWS CLI `ecr get-login-password` documentation: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Amazon ECR registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Google Artifact Registry Docker authentication documentation: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Azure Container Registry authentication documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication

## Issues Found
- The post described the generated Secret as a "docker-registry type" Secret. Updated this to the actual Kubernetes Secret type, `kubernetes.io/dockerconfigjson`, which is what Flux expects for OCIRepository authentication.
- The GHCR section referred to a `packages:read` token scope. Updated it to GitHub's documented `read:packages` scope.
- The ECR static credential example said "static IAM credentials" even though `aws ecr get-login-password` returns a temporary ECR authorization token. Updated the wording to describe the AWS CLI generated authorization token.
- The provider-based AWS, GCP, and Azure examples implied that setting only `provider` is sufficient in all cases. Clarified that the source-controller identity must also be configured with registry access for the examples shown.
- The SOPS command encrypted the file without selecting Kubernetes Secret data fields. Updated it to use `--encrypted-regex '^(data|stringData)$'`, matching the Flux documentation pattern.
- The ECR refresh CronJob used `amazon/aws-cli:latest` while also invoking `kubectl`, but that image is not a Kubernetes client image. Updated the example to use a custom image that includes both AWS CLI and `kubectl`, and changed the secret update to `kubectl apply` via `--dry-run=client -o yaml`.
- The summary repeated the incorrect "docker-registry type" wording. Updated it to `kubernetes.io/dockerconfigjson` and corrected the controller name to `source-controller`.

## Review Notes
- The local environment did not have the Flux CLI installed, so command validation was performed against current official Flux v2.8 documentation rather than local `--help` output.
- The custom ECR refresh CronJob image must be built or supplied by the user and must include both AWS CLI and `kubectl`; the ServiceAccount used by that CronJob also needs RBAC permissions to create or update the Secret.

# Validation Summary: How to Fix Docker 'Unauthorized: Authentication Required' Pull Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker CLI and Docker Engine
- Docker Hub
- Amazon Elastic Container Registry (ECR)
- Google Artifact Registry and Google Container Registry (GCR)
- GitHub Container Registry (GHCR)
- Azure Container Registry (ACR)
- Kubernetes image pull secrets
- Linux systemd proxy configuration

## Sources Consulted
- Docker CLI `docker login` documentation: https://docs.docker.com/reference/cli/docker/login/
- Docker daemon proxy configuration: https://docs.docker.com/engine/daemon/proxy/
- Docker Hub personal access tokens: https://docs.docker.com/security/for-developers/access-tokens/
- Amazon ECR private registry authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS CLI `ecr get-login-password` reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Google Artifact Registry Docker authentication: https://docs.cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud SDK `gcloud auth configure-docker` reference: https://docs.cloud.google.com/sdk/gcloud/reference/auth/configure-docker
- Google `docker-credential-gcr` project documentation: https://github.com/GoogleCloudPlatform/docker-credential-gcr
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Azure Container Registry authentication documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes private registry image pull documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/

## Issues Found
- The Docker Hub personal access token section said Docker Hub PATs do not expire unless revoked. Docker Hub PATs can be configured with expiration dates, so the text now tells readers to check for expiration or revocation.
- The credential-helper test example piped a registry URL into `docker-credential-desktop list`. Docker's credential-helper protocol uses `get` for a server URL payload, while `list` does not take that input. The command now uses `docker-credential-desktop get`.
- The GCR standalone credential-helper install example used `gcloud components install docker-credential-gcr`. Current official standalone helper guidance documents installing the helper from the `GoogleCloudPlatform/docker-credential-gcr` project, including `go install`; the example now uses that command before `docker-credential-gcr configure-docker`.

## Review Notes
- The post correctly uses `--password-stdin` for non-interactive Docker logins, which Docker documents as the safer CLI pattern.
- The ECR login command and 12-hour token lifetime match AWS documentation.
- The Kubernetes `kubectl create secret docker-registry` and `imagePullSecrets` examples match Kubernetes documentation.
- The Docker daemon proxy systemd drop-in example matches Docker documentation for regular, non-rootless Docker Engine installs.

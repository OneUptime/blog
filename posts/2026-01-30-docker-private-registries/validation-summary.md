# Validation Summary: How to Build Docker Images with Private Registries

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Docker CLI and Docker Engine
- Docker private registries and registry mirrors
- Docker credential helpers
- TLS certificates for registry access
- Docker Compose
- Dockerfile build arguments and multi-stage builds
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- Kubernetes image pull secrets
- HashiCorp Vault AppRole
- Container image signing

## Sources Consulted
- Docker CLI `docker login` documentation: https://docs.docker.com/reference/cli/docker/login/
- Docker Engine certificate documentation: https://docs.docker.com/engine/security/certificates/
- Docker daemon configuration reference: https://docs.docker.com/reference/cli/dockerd/
- Docker daemon proxy documentation: https://docs.docker.com/engine/daemon/proxy/
- Docker Hub pull-through cache documentation: https://docs.docker.com/docker-hub/image-library/mirror/
- Docker Compose `version` documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Dockerfile reference and build arguments documentation: https://docs.docker.com/reference/dockerfile/
- Docker Content Trust retirement notice: https://docs.docker.com/engine/security/trust/
- Google `docker-credential-gcr` documentation: https://github.com/GoogleCloudPlatform/docker-credential-gcr
- AWS ECR credential helper documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Docker GitHub Actions documentation: https://docs.docker.com/build/ci/github-actions/
- GitLab Docker-in-Docker documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- Kubernetes private registry pull secret documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Jenkins Pipeline credentials documentation: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- HashiCorp Vault AppRole documentation: https://developer.hashicorp.com/vault/docs/auth/approle
- Local CLI checks: `docker login --help`, `docker build --help`, `docker push --help`, `npm ci --help`, and `docker compose config`

## Issues Found
- Several Docker config examples were fenced as shell snippets or contained JSON comments. I split shell commands from JSON snippets and removed comments from JSON so the examples represent valid Docker config files.
- The Docker daemon TLS subsection implied that daemon TLS settings configure registry certificate trust. I corrected it to explain that `/etc/docker/certs.d/...` controls registry trust, while `tls`, `tlscacert`, `tlscert`, `tlskey`, and `tlsverify` secure the Docker daemon API.
- The Docker Compose pull-through cache example used the obsolete top-level `version: '3.8'` field. I removed it so the file follows the current Compose Specification.
- The Google Container Registry helper install command used `gcloud components install docker-credential-gcr`, which is not the documented standalone helper install path. I changed it to the documented Go install command for `docker-credential-gcr`.
- The Node Dockerfile used `npm ci --only=production`; current npm help documents `--omit=dev` for omitting development dependencies. I updated the command.
- The best-practices list recommended Docker Content Trust as a current signing option. Docker documents DCT retirement, so I updated the recommendation to Sigstore or Notation and noted migration away from DCT.

## Review Notes
The GitLab Docker-in-Docker example assumes a runner configured for privileged Docker-in-Docker with the required certificate volume, as described in GitLab's documentation. The Compose example parses with Docker Compose v5.1.3; local validation only emitted expected warnings for unset example environment variables.

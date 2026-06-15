# Validation Summary: How to Fix Docker 'Image Not Found' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker Hub and Docker Registry HTTP API behavior
- Docker Compose
- GitHub Container Registry
- AWS Elastic Container Registry
- Google Container Registry and Artifact Registry
- Kubernetes imagePullSecrets and ImagePullBackOff troubleshooting

## Sources Consulted
- Docker CLI reference for `docker image pull`: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker CLI reference for `docker manifest inspect`: local `docker manifest inspect --help` from Docker 29.4.2
- Docker CLI reference for `docker run`: local `docker run --help` from Docker 29.4.2
- Docker Compose `up` reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker CLI proxy configuration docs: https://docs.docker.com/engine/cli/proxy/
- Docker daemon proxy configuration docs: https://docs.docker.com/engine/daemon/proxy/
- Docker Hub pull usage and limits: https://docs.docker.com/docker-hub/usage/pulls/
- AWS CLI `ecr get-login-password` reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Amazon ECR private registry authentication docs: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Google Artifact Registry Docker authentication docs: https://docs.cloud.google.com/artifact-registry/docs/docker/authentication
- Google Artifact Registry push and pull docs: https://docs.cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling
- GitHub Container Registry docs: https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Kubernetes private registry pull docs: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes container image docs: https://kubernetes.io/docs/concepts/containers/images/

## Issues Found
- The Docker Hub rate-limit section said users may get a "not found" error when hitting pull limits. Docker Hub documents rate-limit responses separately, so this was changed to say rate limits return a rate-limit error.
- The registry authentication section listed `docker login gcr.io` as a generic Google Container Registry login command. The post already uses `gcloud auth configure-docker` in the Google-specific section, so the generic login example was changed to `docker login registry.example.com`.
- The proxy configuration snippet was labeled as user-level `~/.docker/config.json` but appeared in a section about registry connectivity and image pulls. Docker documents that `~/.docker/config.json` proxy settings apply to containers and builds, not the Docker Engine itself. The snippet was changed to daemon-level `/etc/docker/daemon.json` syntax using `http-proxy`, `https-proxy`, and `no-proxy`.
- The JSON proxy snippet included a JavaScript-style comment, which is invalid JSON. The comment was removed.
- The AWS ECR registry example used a 9-digit account ID. AWS account IDs are 12 digits, so the example was changed to `123456789012.dkr.ecr.us-east-1.amazonaws.com`.

## Review Notes
The Docker commands and flags used in the post were checked against Docker 29.4.2 CLI help where available. `kubectl` was not installed locally, so Kubernetes commands were validated against official Kubernetes documentation instead.

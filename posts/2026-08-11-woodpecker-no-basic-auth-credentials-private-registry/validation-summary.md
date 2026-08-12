# Validation Summary: Fix Woodpecker “No Basic Auth Credentials” Errors

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Woodpecker CI 3.x
- Woodpecker Docker and Kubernetes backends
- Woodpecker registry credentials and registry extensions
- Woodpecker Docker Buildx plugin
- Kubernetes Pods, namespaces, ServiceAccounts, and image pull Secrets
- Docker Engine, Docker CLI, and private container registries
- TLS, private certificate authorities, and OpenSSL

## Sources Consulted

- Woodpecker: Registries and hostname matching - https://woodpecker-ci.org/docs/usage/registries
- Woodpecker: Workflow syntax, including `image` and `pull` - https://woodpecker-ci.org/docs/usage/workflow-syntax#pull
- Woodpecker: Kubernetes backend and private registries - https://woodpecker-ci.org/docs/administration/configuration/backends/kubernetes
- Woodpecker: Server configuration for `WOODPECKER_DOCKER_CONFIG` and `WOODPECKER_PLUGINS_PRIVILEGED` - https://woodpecker-ci.org/docs/administration/configuration/server
- Woodpecker: Registry extension behavior and precedence - https://woodpecker-ci.org/docs/usage/extensions/registry-extension
- Woodpecker: 3.0 migration notes - https://woodpecker-ci.org/migrations#300
- Woodpecker: Docker Buildx plugin settings and custom-registry examples - https://woodpecker-ci.org/plugins/docker-buildx
- Woodpecker Docker Buildx plugin image tags - https://hub.docker.com/r/woodpeckerci/plugin-docker-buildx/tags
- Woodpecker source: static registry precedence - https://github.com/woodpecker-ci/woodpecker/blob/17f2e6e5f0bc28cac8027702ee3ca6c350816a6b/server/services/registry/db.go
- Woodpecker source: Docker-config and extension registry merging - https://github.com/woodpecker-ci/woodpecker/blob/17f2e6e5f0bc28cac8027702ee3ca6c350816a6b/server/services/registry/combined.go and https://github.com/woodpecker-ci/woodpecker/blob/17f2e6e5f0bc28cac8027702ee3ca6c350816a6b/server/services/registry/with_extension.go
- Woodpecker source: Kubernetes namespace and `imagePullSecrets` handling - https://github.com/woodpecker-ci/woodpecker/blob/17f2e6e5f0bc28cac8027702ee3ca6c350816a6b/pipeline/backend/kubernetes/kubernetes.go and https://github.com/woodpecker-ci/woodpecker/blob/17f2e6e5f0bc28cac8027702ee3ca6c350816a6b/pipeline/backend/kubernetes/pod.go
- Kubernetes: Pull an image from a private registry - https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes: `kubectl create secret docker-registry` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes: Configure ServiceAccounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes: Container image names, pull policy, and pull errors - https://kubernetes.io/docs/concepts/containers/images/
- Docker: `docker login`, `docker pull`, and `docker logout` references - https://docs.docker.com/reference/cli/docker/login/, https://docs.docker.com/reference/cli/docker/image/pull/, and https://docs.docker.com/reference/cli/docker/logout/
- Docker: Registry CA certificates and insecure registries - https://docs.docker.com/engine/security/certificates/ and https://docs.docker.com/reference/cli/dockerd/#insecure-registries
- OpenSSL: `s_client` verification options - https://docs.openssl.org/3.0/man1/openssl-s_client/
- CNCF Distribution: Registry HTTP API and token authentication - https://distribution.github.io/distribution/spec/api/ and https://distribution.github.io/distribution/spec/auth/token/
- Go: Release history confirming Go 1.26 availability - https://go.dev/doc/devel/release
- Docker Official Image: `golang` tags - https://hub.docker.com/_/golang/tags

## Issues Found

- The Git-clone diagnostic said all clone failures were unrelated to registry settings. A private custom clone-plugin image can itself fail to pull, so the bullet now applies specifically to Git failures inside an already-running clone step.
- The registry-source discussion did not state the effective precedence and implied that the repository registry view exposed every source. It now documents repository extension over global extension, extensions over directly configured credentials, repository over user/organization over stored global credentials, and stored credentials over `WOODPECKER_DOCKER_CONFIG`; it also notes that dynamic extension results are not shown in the repository view.
- The Kubernetes Secret instruction assumed the base namespace even when namespace-per-organization is enabled. It now says to create the Secret in the workflow Pod's namespace and identifies `WOODPECKER_BACKEND_K8S_NAMESPACE` as the default case.
- The Pod-event explanation claimed that events reveal whether a credential was considered. Kubernetes does not reliably report which matching credential was tried. The text now explains the narrower, documented meaning of `FailedToRetrieveImagePullSecret`.
- The `regcred` statement was too absolute. Woodpecker 3.0 stopped adding that Secret automatically, but Kubernetes can still attach it through a ServiceAccount. The paragraph, checklist, and conclusion now scope the explicit environment-variable requirement to Kubernetes pull Secrets referenced through agent configuration.
- The OpenSSL command supplied SNI but did not verify the certificate hostname or fail on chain errors. Added `-verify_hostname` and `-verify_return_error`, and clarified that the test uses the diagnostic host's OpenSSL trust store.
- The Docker Buildx example omitted `settings.registry`. Because the plugin otherwise defaults authentication to Docker Hub, the supplied credentials would not authenticate to `registry.example.com`. Added `registry: registry.example.com`.
- Woodpecker 3.x no longer grants the Docker Buildx plugin privileged execution by default. Pinned the example to the current `6.1.1` tag and added the requirement to allow the exact image through `WOODPECKER_PLUGINS_PRIVILEGED`.

## Review Notes

The core hostname matching, `pull: true`, pull-versus-push credential separation, `WOODPECKER_DOCKER_CONFIG`, Woodpecker 3.0 pull-secret migration, namespace-per-organization behavior, Docker CLI commands, CA placement, and registry API claims were confirmed. All documentation links in the post resolve to relevant current pages, and `golang:1.26` is a valid current image tag.

The supported `kubectl --docker-password` form places the expanded token in process arguments while `kubectl` runs; on shared systems, use an approved secret-management workflow or create the Secret from a protected Docker configuration file. The `getent` diagnostic is Linux-oriented and may not be present in every node environment. A separate `DOCKER_CONFIG` directory can keep the direct-login test from modifying an existing workstation login.

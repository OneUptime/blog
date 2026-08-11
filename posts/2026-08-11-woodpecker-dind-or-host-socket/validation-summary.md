# Validation Summary: Docker-in-Docker or Host Socket in Woodpecker: Which Image-Build Pattern Is Safer?

## Status
validated

## Post Type
Security comparison / implementation guide

## Technologies Covered
- Woodpecker CI 3.x, including the Docker and Kubernetes backends
- Docker Engine and Docker CLI 29
- Docker-in-Docker (DinD)
- Docker daemon Unix sockets and mutual TLS
- Docker Buildx and `woodpeckerci/plugin-docker-buildx` 6.1.1
- OCI image builds and container registries
- Kubernetes Pods, Pod Security Admission, and security contexts

## Sources Consulted
- Woodpecker advanced usage and TLS-enabled DinD setup: https://woodpecker-ci.org/docs/usage/advanced-usage#docker-in-docker-dind-setup
- Woodpecker volumes and trusted-volume requirements: https://woodpecker-ci.org/docs/usage/volumes
- Woodpecker services and initialization behavior: https://woodpecker-ci.org/docs/usage/services#initialization
- Woodpecker workflow syntax and privileged mode: https://woodpecker-ci.org/docs/usage/workflow-syntax#privileged-mode
- Woodpecker plugin isolation: https://woodpecker-ci.org/docs/usage/plugins/overview
- Woodpecker project trust and pipeline approval settings: https://woodpecker-ci.org/docs/usage/project-settings
- Woodpecker environment variables and secret event filters: https://woodpecker-ci.org/docs/usage/environment and https://woodpecker-ci.org/docs/usage/secrets
- Woodpecker server configuration for `WOODPECKER_PLUGINS_PRIVILEGED`: https://woodpecker-ci.org/docs/administration/configuration/server#plugins_privileged
- Woodpecker 3.0 migration guidance: https://woodpecker-ci.org/migrations#300
- Woodpecker Docker Buildx plugin settings: https://woodpecker-ci.org/plugins/docker-buildx
- Docker Buildx plugin 6.1.1 documentation source: https://codeberg.org/woodpecker-plugins/docker-buildx/src/tag/v6.1.1/docs.md
- Official Buildx plugin image tags: https://hub.docker.com/r/woodpeckerci/plugin-docker-buildx/tags
- Woodpecker Kubernetes backend: https://woodpecker-ci.org/docs/administration/configuration/backends/kubernetes
- Docker Engine security and daemon attack surface: https://docs.docker.com/engine/security/
- Docker daemon socket protection and mutual TLS: https://docs.docker.com/engine/security/protect-access/
- Docker's unauthenticated TCP deprecation: https://docs.docker.com/engine/deprecated/#unauthenticated-tcp-connections
- Docker privileged-container behavior: https://docs.docker.com/engine/containers/run/#runtime-privilege-and-linux-capabilities
- Docker bind-mount read-only semantics: https://docs.docker.com/engine/storage/bind-mounts/
- Docker root-level socket access warning: https://docs.docker.com/engine/install/linux-postinstall/
- Docker rootless mode: https://docs.docker.com/engine/security/rootless/
- Docker Official Image tag manifest: https://raw.githubusercontent.com/docker-library/official-images/master/library/docker
- Docker Official Image DinD TLS entrypoint: https://raw.githubusercontent.com/docker-library/docker/master/dockerd-entrypoint.sh
- Kubernetes privileged-container behavior: https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/

## Issues Found
- The Buildx example pushed to `registry.example.com` but omitted the plugin's `registry` setting. Version 6.1.1 defaults that setting to Docker Hub, so the supplied credentials would authenticate to the wrong registry and a private push would normally fail. Added `registry: registry.example.com`.
- The DinD build step attempted `docker version` immediately after Woodpecker started the service. Woodpecker does not provide a service-readiness gate, so the client could race dockerd startup and TLS certificate generation. Added a bounded 30-attempt `docker info` readiness loop before the version check and build.
- The certificate guidance warned only against sharing a writable certificate directory between concurrent workflows. The official DinD entrypoint reuses existing CA and client private keys, so sequential reuse can also leave earlier client credentials valid against a later daemon. Changed the guidance to scope the directory per workflow and prohibit both concurrent and sequential reuse across unrelated workflows.
- The Buildx publication step had no event or branch condition. It could therefore be selected for pull-request and unrelated event pipelines, contrary to the post's protected-publication guidance, and its publishing secrets are not available to pull requests by default. Added a condition limiting the example to pushes on the repository's default branch.

## Review Notes
The corrected YAML blocks parse successfully, the readiness command is valid POSIX shell syntax, and the Buildx workflow passes Woodpecker CLI 3.17.0 strict lint when the documented exact plugin allowlist is supplied. The host-socket and DinD comparison snippets also pass Woodpecker lint, with only the generic recommendation to add event filters to complete workflows. The documented `docker:29-cli`, `docker:29-dind`, and `woodpeckerci/plugin-docker-buildx:6.1.1` tags exist; the Docker 29 tags are mutable major-version tags, so production configurations should use exact patch tags or digests when stronger reproducibility is required. The host-socket privilege analysis, mutual-TLS variables and port, Woodpecker 3.x privileged-plugin migration, read-only socket warning, and Kubernetes security discussion are technically accurate. The current Woodpecker Kubernetes documentation itself uses `detached: true` in one DinD example even though the workflow key is `detach: true`; the post describes the pattern only in prose and does not reproduce that upstream documentation inconsistency.

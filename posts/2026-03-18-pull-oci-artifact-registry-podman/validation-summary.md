# Validation Summary: How to Pull an OCI Artifact from a Registry with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- OCI artifacts
- Container registries
- Docker Hub
- GitHub Container Registry
- Bash scripting
- jq

## Sources Consulted
- Podman `podman artifact` official documentation: https://docs.podman.io/en/latest/markdown/podman-artifact.1.html
- Podman `podman artifact pull` official documentation: https://docs.podman.io/en/latest/markdown/podman-artifact-pull.1.html
- Podman `podman artifact inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-artifact-inspect.1.html
- Podman `podman artifact ls` official documentation: https://docs.podman.io/en/latest/markdown/podman-artifact-ls.1.html
- Podman `podman artifact extract` official documentation: https://docs.podman.io/en/latest/markdown/podman-artifact-extract.1.html
- Podman `podman login` official documentation: https://docs.podman.io/en/latest/markdown/podman-login.1.html
- Docker Hub software artifacts documentation: https://docs.docker.com/docker-hub/repos/manage/hub-images/oci-artifacts/
- GitHub Container Registry documentation: https://docs.github.com/packages/getting-started-with-github-container-registry/about-github-container-registry
- OCI Distribution Specification: https://github.com/opencontainers/distribution-spec/blob/main/spec.md

## Issues Found
- The `jq` examples used `.layers[]`, but `podman artifact inspect` outputs layer descriptors under `.Manifest.layers[]`. Updated both examples to use `.Manifest.layers[]`.
- The CI/CD example said it extracted configuration, but the command shown only inspects artifact annotations. Updated the comment to say it inspects configuration metadata.

## Review Notes
Podman was not installed in the local review environment, so command behavior was verified against official Podman documentation rather than local `--help` output. The artifact commands are documented in Podman 5.x, with early 5.x documentation marking them experimental.

# Validation Summary: How to Pull an Image by Digest with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Skopeo
- OCI and Docker container image references
- Containerfiles
- Docker Hub and Quay.io container registries

## Sources Consulted
- Podman `pull` documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman `image inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman `images` documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `manifest inspect` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-manifest-inspect.1.html
- Podman `build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Containers image reference grammar: https://pkg.go.dev/github.com/containers/image/v4/docker/reference
- Skopeo documentation: https://github.com/containers/skopeo
- Docker Registry HTTP API checks for Docker Hub and Quay.io manifest digests.

## Issues Found
- The nginx digest used throughout the post did not resolve in Docker Hub. Replaced it with a currently resolvable `docker.io/library/nginx:1.25` manifest digest: `sha256:a484819eb60211f5299034ac80f6a681b06f89e65866ce91f356ed7c72af059c`.
- The Quay.io Prometheus example used a placeholder digest that returned a registry 404. Replaced it with a real `quay.io/prometheus/prometheus` digest: `sha256:c0b857aead0d5793aa566adb8f49a9983d6f6031652098759d521a330cfa050f`.
- The verification example used `.Digest`, but Podman also documents `.RepoDigests` for repository digest references. Updated the verification command to check `.RepoDigests` for the expected fully qualified digest reference.
- The digest-based comparison examples used an unqualified `nginx` short name. Updated the digest-pinned references to `docker.io/library/nginx` to avoid Podman short-name resolution ambiguity.

## Review Notes
Podman and Skopeo were not installed in the local environment, so CLI behavior was verified against official documentation and registry HTTP API responses instead of local command execution.

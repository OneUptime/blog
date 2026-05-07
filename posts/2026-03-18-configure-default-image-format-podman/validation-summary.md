# Validation Summary: How to Configure Default Image Format in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- containers.conf
- OCI image format
- Docker v2 schema 2 image format
- Skopeo
- Container registries

## Sources Consulted
- Podman `podman-build(1)` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman-push(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `podman-image-inspect(1)` documentation: https://docs.podman.io/en/v5.2.1/markdown/podman-image-inspect.1.html
- `containers.conf(5)` man page: https://www.mankier.com/5/containers.conf
- OCI Image Format Specification: https://github.com/opencontainers/image-spec
- Skopeo repository and transport documentation: https://github.com/containers/skopeo

## Issues Found
- The post used `image_default_format = "docker"` in `containers.conf`, but the documented `containers.conf` values are `oci`, `v2s2`, or `v2s1`. I changed the Docker-format configuration example to `image_default_format = "v2s2"` and updated the option comments.
- The post showed `podman push --format docker`, but Podman documents push manifest formats as `oci`, `v2s2`, or `v2s1`. I changed the push examples to `podman push --format v2s2`.
- The initial "check the current default image format" command parsed `podman info` but only printed a static message, so it did not check the setting. I replaced it with a direct check for `image_default_format` in the user-level `containers.conf`.
- The Docker-specific guidance said to use Docker-specific manifest features. I narrowed that wording to Docker v2 schema 2 manifests because that is the documented format being selected.

## Review Notes
- `podman build --format docker` is still correct for per-build overrides; Podman documents `docker` and `oci` as accepted build formats.
- `podman image inspect --format '{{.ManifestType}}'` is supported and is an appropriate way to inspect the stored image manifest type.
- Podman is not installed in this environment, so CLI behavior was verified against official documentation rather than local command execution.

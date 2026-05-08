# Validation Summary: How to Use --volumes-from to Share Volumes in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container volumes and named volumes
- Fluent Bit
- Go container images
- PostgreSQL container images
- Alpine Linux containers

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman create` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Fluent Bit Docker installation documentation: https://docs.fluentbit.io/manual/installation/docker
- Fluent Bit tail input documentation: https://docs.fluentbit.io/manual/1.2/input/tail
- Go release history and support policy: https://go.dev/doc/devel/release

## Issues Found
- The Fluent Bit sidecar example used `fluentbit:latest` and explicitly passed `fluent-bit` as the container command. Fluent Bit's official container image is `cr.fluentbit.io/fluent/fluent-bit`, and the image already uses the Fluent Bit binary as its entrypoint, so the example was updated to pass only the CLI arguments.
- The CI/CD example used `golang:1.21`, which is no longer a supported Go release. Updated it to `golang:1.26`, a currently supported Go release as of the validation date.

## Review Notes
Podman's official documentation confirms that `--volumes-from=CONTAINER[:OPTIONS]` mounts volumes from an existing source container, accepts `ro`, `rw`, and `z` options, preserves source mount paths, and works when the source container is not running. Podman was not installed in the local environment, so CLI behavior was verified against official documentation rather than local `--help` output.

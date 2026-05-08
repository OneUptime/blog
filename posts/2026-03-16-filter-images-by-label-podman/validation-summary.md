# Validation Summary: How to Filter Images by Label with Podman

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Podman
- Container images
- Containerfile labels
- OCI image metadata labels
- Go templates
- JSON output
- Bash scripting

## Sources Consulted
- Podman `podman-images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman-image-inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman `podman-build` official documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- OCI Image Format Specification, predefined annotation keys: https://specs.opencontainers.org/image-spec/annotations/

## Issues Found
- The label inspection examples used `podman inspect nginx:1.25`, which was not the image built in the tutorial and might not contain the labels being demonstrated. Updated the examples to use `podman image inspect myapp:1.0`.
- The JSON processing example used `repository`, `tag`, and `labels` as if `podman images --format json` returned the same field names as Go templates. Podman's documented JSON output uses lower-case keys such as `names`, so the example now reads `names` and falls back to the image ID.
- The combined reference filter used `myapp*`, which reads like a shell glob even though Podman documents the `reference` filter as accepting regex-style expressions. Updated it to `.*myapp.*`.
- The audit script used generic `podman inspect` for image metadata. Updated it to `podman image inspect` to avoid ambiguity with containers, pods, networks, and volumes.

## Review Notes
Podman is not installed in the local environment, so CLI behavior was verified against official Podman documentation rather than local `--help` output. The main label filter forms, `label=key` and `label=key=value`, match the current official `podman images` documentation.

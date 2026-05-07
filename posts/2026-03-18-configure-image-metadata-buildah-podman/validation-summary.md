# Validation Summary: How to Configure Image Metadata with Buildah and Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Buildah
- Podman
- Container images
- OCI image metadata
- Image labels, environment variables, ports, users, volumes, entrypoints, commands, working directories, stop signals, shell, and author/comment metadata

## Sources Consulted
- Buildah `buildah-config(1)` official source documentation: https://github.com/containers/buildah/blob/main/docs/buildah-config.1.md
- Buildah `buildah-inspect(1)` manual documentation: https://www.mankier.com/1/buildah-inspect
- Buildah `buildah-run(1)` manual documentation: https://www.mankier.com/1/buildah-run
- Podman `podman-inspect(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman `podman-stop(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-stop.1.html
- Open Container Initiative Image Specification annotation keys: https://specs.opencontainers.org/image-spec/annotations/

## Issues Found
- The introduction claimed the guide covered every metadata option available and that `buildah config` sets all aspects of image metadata. Buildah has additional options such as annotations, architecture, OS fields, healthchecks, hostname, domain name, and ONBUILD settings. I narrowed the wording to "image configuration metadata" and "the most common runtime and descriptive metadata options."
- The stop-signal section said the default is `SIGTERM`. Buildah's `buildah config --stop-signal` documentation states the image stop-signal setting defaults to `SIGINT`, while Podman stop behavior uses `SIGTERM` when stopping containers by default. I corrected the section to describe the Buildah image metadata setting specifically.
- The summary said Buildah config controls every aspect of image metadata and that all metadata runs correctly with any OCI-compatible runtime. I adjusted this to "common container image metadata" and clarified that committed metadata can be used by Podman or OCI-compatible runtimes.

## Review Notes
Buildah and Podman were not installed in the local environment, so CLI behavior was validated against official/current online manuals rather than live command execution. The command syntax and Go-template inspect examples match the documented Buildah and Podman interfaces.

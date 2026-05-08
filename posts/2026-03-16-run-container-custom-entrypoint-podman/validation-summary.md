# Validation Summary: How to Run a Container with a Custom Entrypoint in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containers
- OCI image ENTRYPOINT and CMD metadata
- Shell entrypoint scripts
- PostgreSQL client utilities in containers
- npm commands in application containers

## Sources Consulted
- Podman `podman-run` official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- OCI Image Specification config documentation: https://github.com/opencontainers/image-spec/blob/main/config.md
- Dockerfile reference for ENTRYPOINT/CMD behavior and exec vs shell form: https://docs.docker.com/reference/builder
- Docker JSONArgsRecommended build check for signal-handling context: https://docs.docker.com/reference/build-checks/json-args-recommended/

## Issues Found
- The post stated that Podman's `--entrypoint` JSON array form is preferred because it makes the process PID 1 and receive signals properly. That signal-handling guidance applies to Dockerfile shell form vs exec form, but Podman's `--entrypoint /usr/bin/node myapp server.js` form is also a direct executable override. I changed this section to explain that JSON array form is useful when the replacement entrypoint itself has fixed arguments or when avoiding shell-style splitting and quoting issues.

## Review Notes
- Podman is not installed in the local workspace, so command behavior was validated against the current official Podman documentation rather than local execution.
- The remaining examples follow the documented `podman run [options] image [command [arg...]]` syntax and the documented `--entrypoint="command" | '["command", "arg1", ...]'` option behavior.

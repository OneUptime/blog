# Validation Summary: How to Create a Container Without Starting It in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Linux containers
- Container lifecycle management
- Container networking
- Container file copying

## Sources Consulted
- Podman `create` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `start` documentation: https://docs.podman.io/en/latest/markdown/podman-start.1.html
- Podman `ps` documentation: https://docs.podman.io/en/latest/markdown/podman-ps.1.html
- Podman `cp` documentation: https://docs.podman.io/en/latest/markdown/podman-cp.1.html
- Podman `inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman `rm` documentation: https://docs.podman.io/en/latest/markdown/podman-rm.1.html
- Podman `network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html

## Issues Found
- The file-copying example copied `/tmp/config.json` to `app-container:/app/config.json`, but the Alpine image does not provide an `/app` directory by default. Changed the container command and copy destination to use `/tmp/config.json`, whose parent directory exists in the image.
- The coordinated startup example created containers with `--network mynet` before creating `mynet`. Since `--network` expects an existing user-defined network, moved `podman network create mynet` before the container creation commands.
- The coordinated startup example used `podman ps --filter name=app` to check both containers, but `app-web` exits immediately after running `echo`, so it would not appear in default `podman ps` output. Changed the command to `podman ps -a --filter name=app`.

## Review Notes
Podman was not installed in the local environment, so command behavior was verified against the official Podman documentation rather than local execution. Resource limit flags such as `--memory` and `--cpus` are valid, but Podman documents rootless and cgroups-version caveats for some systems.

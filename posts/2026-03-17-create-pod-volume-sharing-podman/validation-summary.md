# Validation Summary: How to Create a Pod with Volume Sharing in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods
- Podman named volumes
- Bind mounts
- Container init containers
- Nginx and Alpine container images

## Sources Consulted
- Podman `podman-run` manual: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-create` manual: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman-pod-create` manual: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Podman `podman-pod-start` manual: https://docs.podman.io/en/latest/markdown/podman-pod-start.1.html
- Podman `podman-volume-create` manual: https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html

## Issues Found
- The init-container example used `podman run --pod config-pod --init-ctr always` followed by a detached `podman run` for the application. Podman documents init containers as containers created in a pod and run on `podman pod start`, before regular pod containers. I changed the init and app containers to `podman create`, then added `podman pod start config-pod` so the init-container ordering matches Podman's lifecycle.
- The config example used `echo` with `\n` escapes. Because `echo` handling of backslash escapes varies by shell implementation, I changed it to `printf` for a portable multiline config write.

## Review Notes
The named volume and bind mount examples use valid Podman `-v` syntax, and `:ro` is a valid read-only mount option. On SELinux-enabled hosts, bind mounts shared by containers may need an added `:z` relabel option or an appropriate pre-existing label, but the commands are otherwise correct.

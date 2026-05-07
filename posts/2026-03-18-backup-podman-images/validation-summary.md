# Validation Summary: How to Backup Podman Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container images
- Container registries
- Bash scripting
- containers-registries.conf

## Sources Consulted
- Podman `podman-save` documentation: https://docs.podman.io/en/stable/markdown/podman-save.1.html
- Podman `podman-load` documentation: https://docs.podman.io/en/stable/markdown/podman-load.1.html
- Podman `podman-images` documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman-ps` documentation: https://docs.podman.io/en/stable/markdown/podman-ps.1.html
- Podman `podman-push` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `podman-run` documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman `podman-image-exists` documentation: https://docs.podman.io/en/stable/markdown/podman-image-exists.1.html
- containers-registries.conf documentation: https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md
- CNCF Distribution registry deployment documentation: https://distribution.github.io/distribution/about/deploying/

## Issues Found
- The multi-image `podman save` example omitted `--multi-image-archive`. Current Podman documentation states this option is required so additional arguments are interpreted as images instead of tags when creating a multi-image Docker archive. Added the flag.
- The image ID backup examples used `${IMAGE_ID:0:12}` directly in filenames. `podman inspect --format '{{.Id}}'` can return a value prefixed with `sha256:`, and Podman documentation notes `:` is restricted in archive filenames. Added `IMAGE_ID_SHORT=${IMAGE_ID#sha256:}` and used that for filenames.
- The local registry note implied rootless Podman should add `localhost:5000` to the unqualified search list or edit only `/etc/containers/registries.conf`. The unqualified search list is for resolving short image names, while insecure registry configuration belongs in `/etc/containers/registries.conf` or `$HOME/.config/containers/registries.conf` for rootless-only use. Updated the wording.
- The verification script attempted to run `echo` inside every restored image. That can fail for valid images because not every image contains `echo` in PATH or accepts an arbitrary command after its entrypoint. Replaced it with `podman image exists`, which verifies the loaded image is present in local storage.
- The verification section described all saved images but the script only accepts gzip-compressed archives. Updated the wording to say it verifies compressed saved images.

## Review Notes
Podman was not installed in the local workspace, so command behavior was verified against current official Podman documentation rather than local `--help` output. The `registry:2` image remains plausible, although current CNCF Distribution examples use `registry:3`.

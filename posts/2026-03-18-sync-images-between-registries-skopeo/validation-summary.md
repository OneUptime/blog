# Validation Summary: How to Sync Images Between Registries with Skopeo

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Skopeo
- Podman
- Container registries
- Container image mirroring
- YAML sync configuration
- Cron automation

## Sources Consulted
- Skopeo upstream `skopeo-sync(1)` documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-sync.1.md
- Skopeo upstream `skopeo(1)` documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo.1.md
- Skopeo upstream `skopeo-login(1)` documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-login.1.md
- Containers `auth.json` documentation: https://github.com/containers/image/blob/main/docs/containers-auth.json.5.md
- Podman login documentation: https://docs.podman.io/en/v5.1.0/markdown/podman-login.1.html

## Issues Found
- The installation section claimed that `sync` requires Skopeo 0.2+. The current upstream man page documents `skopeo sync` but does not support that version-specific statement, so the comment was changed to simply verify the installed version.
- The local directory sync example said `/opt/image-mirror/alpine/` would contain tag subdirectories. Upstream `skopeo sync --dest dir` creates one directory per copied `image:tag`, such as `alpine:latest`, so the listing command was corrected to list the destination directory itself.
- The local-directory-to-registry example used `/opt/image-mirror/` as the source. Upstream examples show `--src dir` pointing at a specific local image directory such as `busybox:1-glibc`, so the example was changed to `/opt/image-mirror/alpine:latest`.
- The YAML `images-by-tag-regex` example used a list value. Upstream documentation shows each image mapped to a single regex string, so `library/python` was changed to use the scalar regex value directly.
- The shared auth file example used `~/.config/containers/auth.json`. On Linux, the primary Podman/Skopeo auth file is `${XDG_RUNTIME_DIR}/containers/auth.json`, so the example was updated to that default path.

## Review Notes
The local environment did not have `skopeo` installed, so command verification was performed against the upstream Skopeo and containers documentation rather than local `--help` output. The examples use placeholder registries and may still require valid credentials, registry access, and suitable permissions on destination directories when run in a real environment.

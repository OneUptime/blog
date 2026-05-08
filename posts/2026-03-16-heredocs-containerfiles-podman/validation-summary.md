# Validation Summary: How to Use Heredocs in Containerfiles with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Buildah
- Containerfile / Dockerfile syntax
- Dockerfile heredocs
- Alpine Linux
- nginx
- Shell scripting

## Sources Consulted
- Dockerfile reference, including parser directives, `COPY`, `ENTRYPOINT`, and here-document behavior: https://docs.docker.com/reference/dockerfile/
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Buildah 1.33.0 release notes documenting heredoc support for `RUN`, `COPY`, and `ADD`: https://buildah.io/releases/2023/11/17/Buildah-version-v1.33.0.html
- POSIX shell here-document rules referenced by the Dockerfile documentation: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html#tag_19_07_04

## Issues Found
- The introduction and summary implied heredocs require BuildKit-compatible syntax and a syntax directive. This was inaccurate for Podman because Podman builds through Buildah, and Buildah added native Containerfile heredoc support. Updated the wording to say heredocs are part of modern Dockerfile syntax, supported by Podman's Buildah backend in current releases, and that the syntax directive is for Dockerfile frontend compatibility.
- The nginx `COPY` heredoc used an unquoted delimiter while the nginx config contained `$uri`. Dockerfile heredoc expansion can expand unquoted variables while creating inline files, so `$uri` could be lost. Changed the delimiter to `<<'EOF'` to preserve nginx variables literally.
- The variable expansion section implied that quoting a `RUN` heredoc delimiter alone prevents all variable expansion. For `RUN`, the shell still applies normal shell expansion when it executes the script. Clarified the explanation and comment so the example correctly relies on both a quoted delimiter and shell single quotes.
- The healthcheck example used `curl` on `alpine:3.19` without installing it. Added `RUN apk add --no-cache curl` before creating the healthcheck script.

## Review Notes
Podman and Buildah were not installed in the local workspace, so the examples were reviewed against official documentation and static command/configuration analysis rather than executed locally.

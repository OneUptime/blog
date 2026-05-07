# Validation Summary: How to Use Docker Hub with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Docker Hub
- Docker Registry HTTP API V2
- containers registries.conf
- Skopeo
- Bash
- CI/CD authentication with access tokens

## Sources Consulted
- Podman `podman info` documentation: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- Podman `podman pull` documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman `podman push` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `podman search` documentation: https://docs.podman.io/en/stable/markdown/podman-search.1.html
- Podman `podman login` documentation: https://docs.podman.io/en/v2.0.6/markdown/podman-login.1.html
- containers-registries.conf man page: https://manpages.debian.org/testing/buildah/containers-registries.conf.5.en.html
- Docker Hub pull usage and limits documentation: https://docs.docker.com/docker-hub/usage/pulls/
- Docker Hub access tokens documentation: https://docs.docker.com/docker-hub/access-tokens/
- Skopeo `list-tags` man page: https://www.mankier.com/1/skopeo-list-tags

## Issues Found
- The `podman info --format '{{.Registries.Search}}'` example used an incorrect Go template lookup for the search registry list. Updated it to `{{index .Registries "search"}}`, which matches the official Podman documentation.
- The registries.conf example appended `unqualified-search-registries` directly to `/etc/containers/registries.conf`, which can create duplicate TOML keys if the file already has that setting. Updated it to write a small drop-in file under `/etc/containers/registries.conf.d/`.
- The Docker Hub rate-limit check used a GET request against `library/alpine`. Docker documents using the `ratelimitpreview/test` repository and recommends HEAD because GET emulates a pull and can count against the limit. Updated the token scope and manifest request accordingly.
- The post used `podman push --all-tags`, but current `podman push` documentation does not include an `--all-tags` option. Replaced it with a simple loop that pushes the intended tags individually.

## Review Notes
- Podman and Docker Hub registry operations in the post are otherwise accurate for current Podman behavior.
- The local workspace does not have `podman` or `skopeo` installed, so command verification was performed against official/current documentation rather than local `--help` output.

# Validation Summary: How to Push an Image to Docker Hub with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Docker Hub
- Container registries
- Container image tagging and pushing
- Docker Hub access tokens
- Multi-architecture manifest lists
- Skopeo
- Shell scripting

## Sources Consulted
- Podman `podman login` documentation: https://docs.podman.io/en/stable/markdown/podman-login.1.html
- Podman `podman push` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `podman tag` documentation: https://docs.podman.io/en/stable/markdown/podman-tag.1.html
- Podman `podman images` documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman search` documentation: https://docs.podman.io/en/stable/markdown/podman-search.1.html
- Podman `podman manifest create` documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-create.1.html
- Podman `podman manifest add` documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-add.1.html
- Podman `podman manifest push` documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-push.1.html
- Docker Hub push images documentation: https://docs.docker.com/docker-hub/repos/manage/hub-images/push/
- Docker Hub tag documentation: https://docs.docker.com/docker-hub/repos/manage/hub-images/tags/
- Docker Hub access token documentation: https://docs.docker.com/docker-hub/access-tokens/
- Docker Hub usage and pull limits documentation: https://docs.docker.com/docker-hub/usage/
- Docker Hub pull usage and limits documentation: https://docs.docker.com/docker-hub/usage/storage/

## Issues Found
- The authentication example implied `~/.config/containers/auth.json` is the default credential file everywhere. Podman's Linux default is `${XDG_RUNTIME_DIR}/containers/auth.json`; `~/.config/containers/auth.json` is used by default on Windows/macOS and can be selected explicitly on Linux with `--authfile`. Updated the example to avoid a misleading `cat` command and show explicit persistent auth-file usage.
- The interactive login comment only mentioned a Docker Hub password. Docker Hub personal access tokens are valid for CLI authentication and required when 2FA is enabled. Updated the wording to mention password or access token.
- The access-token setup URL was overly specific to an older Docker Hub UI path. Updated it to refer to Docker Hub account settings, matching current Docker documentation.
- The rate-limit section said "pull and push limits" and described Pro/Team as merely "higher limits." Docker's current documentation describes pull rate limits: Personal authenticated users receive 200 pulls per 6 hours, unauthenticated users receive 100 pulls per 6 hours per IPv4 address or IPv6 /64 subnet, and Pro/Team/Business users have unlimited pulls subject to fair use. Updated the section wording and comments.
- The rate-limit check used `library/nginx`; Docker's current documentation uses `ratelimitpreview/test` for checking rate-limit headers. Updated the token scope and manifest URL to match the documented endpoint.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was verified against official Podman reference documentation rather than local `--help` output. The remaining commands and examples match the documented Podman and Docker Hub workflows.

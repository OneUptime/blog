# Validation Summary: How to Set Up Docker Container User Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile
- Docker Compose
- Linux users, groups, UIDs, and GIDs
- Docker user namespace remapping
- Docker container security options
- Node.js container images
- Alpine Linux utilities

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker `docker container run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker user namespace remapping documentation: https://docs.docker.com/engine/security/userns-remap/
- Docker UID/GID mapping documentation: https://docs.docker.com/engine/security/rootless/uid-gid-mapping/
- Docker tmpfs mounts documentation: https://docs.docker.com/engine/storage/tmpfs/
- Docker seccomp security profiles documentation: https://docs.docker.com/engine/security/seccomp/
- Node.js official EOL documentation: https://nodejs.org/en/about/eol
- Node.js official previous releases table: https://nodejs.org/en/about/previous-releases
- Local Docker CLI help for `docker run` and `docker build`

## Issues Found
- The Dockerfile examples used `node:18-alpine`. Node.js 18 is end-of-life and no longer receives security updates, so the examples were updated to `node:24-alpine`, the current LTS line as of the review date.
- The npm examples used `npm ci --only=production`. Updated these to `npm ci --omit=dev`, which is the current npm form for omitting development dependencies.
- The entrypoint example used `su-exec` but did not install it in the Alpine-based image. Added `apk add --no-cache su-exec` to make the example work as written.
- Several Docker Compose examples included `version: '3.8'`. The Compose Specification treats the top-level `version` property as obsolete, so those lines were removed.
- The `/etc/docker/daemon.json` example included a comment inside a `json` code block. Since Docker daemon JSON does not accept comments, the path note was moved outside the JSON snippet.

## Review Notes
The remaining Docker CLI flags, Dockerfile instructions, Compose service keys, user namespace remapping explanation, tmpfs usage, seccomp option, `no-new-privileges`, capability dropping, and `init: true` examples match current Docker documentation. The article remains a practical guide rather than a full hardening checklist; future improvements could mention Docker rootless mode separately from user namespace remapping.

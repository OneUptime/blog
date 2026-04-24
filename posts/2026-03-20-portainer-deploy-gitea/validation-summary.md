# Validation Summary: How to Deploy Gitea via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose
- Gitea
- PostgreSQL
- Git over SSH
- Gitea Actions / act_runner
- npm-based CI workflows
- GitLab resource sizing comparison

## Sources Consulted
- Gitea Documentation: Installation with Docker — https://docs.gitea.com/installation/install-with-docker
- Gitea Documentation: Configuration Cheat Sheet — https://docs.gitea.com/administration/config-cheat-sheet
- Gitea Documentation: Actions Overview — https://docs.gitea.com/usage/actions/overview
- Gitea Documentation: Actions Quick Start — https://docs.gitea.com/usage/actions/quickstart
- Gitea Documentation: Act Runner — https://docs.gitea.com/usage/actions/act-runner
- Gitea Documentation: Design of Gitea Actions — https://docs.gitea.com/usage/actions/design
- Gitea Documentation: What is Gitea? — https://docs.gitea.com/
- GitLab Docs: Installation requirements — https://docs.gitlab.com/install/requirements/
- PostgreSQL Docker Official Image docs — https://hub.docker.com/_/postgres
- npm Docs: `npm run-script` / `--if-present` — https://docs.npmjs.com/cli/v8/commands/npm-run-script/

## Issues Found

1. **The Gitea Docker image reference and SSH port setting were misleading.** The post used `gitea/gitea:latest` and set `GITEA__server__SSH_PORT=22` while publishing SSH on host port `222`. I changed the image to the official `docker.gitea.com/gitea:latest` reference used in Gitea's Docker docs and changed `SSH_PORT` to `222`, because Gitea documents `SSH_PORT` as the port shown in clone URLs.

2. **The Gitea Actions section overstated compatibility and omitted required enablement details.** Gitea documents Actions as available starting in 1.19, mostly compatible with GitHub Actions, enabled by default only since 1.21, and disabled per repository by default. I updated the text to reflect those version-specific details and added the missing repository-level enablement step.

3. **The workflow example implied a default runner could build Docker images without additional runner configuration.** The runner docs focus on label-to-environment mappings and the default `ubuntu-latest` runner label maps to a standard containerized environment, not a guaranteed Docker build environment. I replaced the `docker build` step with `npm run build --if-present`, which is a valid generic CI step and is documented by npm.

4. **The runner Compose snippet was not valid as a standalone deployment example.** It declared `depends_on: gitea` even though no `gitea` service existed in that snippet, and it used `http://gitea:3000` as the instance URL. Gitea's Actions docs explain that runners and job containers must both be able to reach the instance URL, and that internal-only or loopback-style addresses are problematic. I removed `depends_on` and changed the instance URL to `http://git.example.com:3000`.

5. **The resource comparison table used outdated or unsupported figures.** The original table claimed `100MB` RAM for Gitea, `4GB` RAM for GitLab CE, and fixed startup/disk figures that are not supported by the current official docs. I replaced those numbers with current documented guidance: Gitea typically needs 2 CPU cores and 1GB RAM for small teams/projects, while GitLab documents 8GB minimum in some cases, 16GB recommended for up to 1,000 users, 8 vCPU for that scale, and at least 40GB storage for a basic installation.

## Review Notes
- The post still uses `latest` tags for Gitea and `act_runner`. This is allowed by the official docs, but pinning a specific stable version would make the deployment more repeatable.
- The runner example still mounts `/var/run/docker.sock`. Gitea's runner docs explicitly warn that this has security implications because jobs may be able to access the Docker socket.

# Validation Summary: How to Deploy Applications to Low-Bandwidth Edge Sites with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Edge (Edge Agent, Edge Jobs, Edge Environments)
- Docker / Docker Compose
- Docker Registry (pull-through cache mode)
- Base images: Ubuntu, Alpine, distroless, scratch
- Node.js / npm (npm ci)
- Watchtower (containrrr/watchtower)
- Cron scheduling

## Sources Consulted
- Docker Hub - ubuntu official image tags: https://hub.docker.com/_/ubuntu/tags
- Docker Hub - registry official image tags: https://hub.docker.com/_/registry/tags
- npm CLI documentation (npm ci): https://docs.npmjs.com/cli/v10/commands/npm-ci
- Watchtower releases: https://github.com/containrrr/watchtower/releases
- Portainer Edge Compute documentation: https://docs.portainer.io/admin/settings/edge
- Docker Registry documentation for pull-through cache configuration

## Issues Found
1. **Ubuntu base image size was incorrect.** The post claimed "77MB compressed" for `ubuntu:22.04`. Per Docker Hub, the linux/amd64 compressed download size is ~28MB; ~77MB is the uncompressed/on-disk size. Updated the comment to "~28MB compressed, ~77MB on disk" to clarify both numbers correctly. Also tightened the Alpine annotation to `~3.4MB` to match Docker Hub.
2. **Deprecated npm flag.** The Dockerfile in Strategy 4 used `npm ci --only=production`. The `--only` flag is deprecated; the current recommended form is `npm ci --omit=dev` (per the npm v10 docs). Updated accordingly.

## Review Notes
- `registry:2.8` is a valid tag and is what the post pins. Note that `registry:3` (3.1.0) is now the latest stable tag — readers may want to consider upgrading. Left as-is since 2.8 still works and the post does not need restructuring.
- Watchtower 1.7.1 is a valid release. Note the upstream repository was archived on 2025-12-17 and is now read-only — long-term maintenance should be considered, but the configuration shown is correct for the version pinned.
- The `WATCHTOWER_SCHEDULE=0 0 3 * * *` cron uses Watchtower's expected 6-field (with-seconds) cron format — correct.
- The Portainer Edge Agent default poll interval claim (5 seconds) and the math for ~17,280 / ~720 daily check-ins are arithmetically correct (86400/5 and 86400/120).
- Using `http://localhost:5000` in `registry-mirrors` works because Docker treats `localhost` as an allowed insecure registry by default; if readers move the registry to another host they will additionally need to configure `insecure-registries` or use TLS.
- `com.centurylinklabs.watchtower.enable` is the correct label key for Watchtower's selective-update feature.

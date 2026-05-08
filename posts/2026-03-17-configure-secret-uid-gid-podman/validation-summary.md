# Validation Summary: How to Configure Secret UID and GID in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman secrets
- Linux UID/GID file ownership
- Container file permissions
- Node.js container images
- Nginx container images

## Sources Consulted
- Podman `podman run` official documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman secret create` official documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Node.js official release schedule: https://github.com/nodejs/Release
- Node.js Docker official image repository: https://github.com/nodejs/docker-node
- Nginx Docker official image documentation: https://hub.docker.com/_/nginx
- Nginx Docker official image Dockerfile: https://github.com/nginxinc/docker-nginx

## Issues Found
- The Node.js example used `node:18-alpine`. Node.js 18 reached end-of-life on April 30, 2025, so the example was changed to `node:lts-alpine` to avoid recommending an EOL runtime while preserving the documented `node` user UID/GID behavior.

## Review Notes
Podman's official documentation confirms that mounted secrets support `uid`, `gid`, `mode`, and `target` options, with mounted secrets defaulting to `/run/secrets/<secretname>` on Linux. The `podman secret create` examples using stdin and file paths match the documented syntax. The Nginx official image documentation confirms the `nginx` user and group use UID/GID 101 in current Debian and Alpine variants.

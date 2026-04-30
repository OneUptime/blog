# Validation Summary: How to Fix Portainer Blank Screen or Loading Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Nginx
- WebSockets
- Browser cache and browser developer tools
- Linux container troubleshooting

## Sources Consulted
- Portainer FAQ: After upgrading, why doesn’t my version number match the latest version? https://docs.portainer.io/faqs/upgrading/after-upgrading-why-doesnt-my-version-number-match-the-latest-version
- Portainer FAQ: Unable to Authenticate After Portainer Update https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/unable-to-authenticate-after-portainer-update
- Portainer FAQ: What does Portainer's backup include? https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer Admin Settings: Back up Portainer https://docs.portainer.io/admin/settings/general
- Portainer FAQ: Why is my console closing after a certain time? https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/why-is-my-console-closing-after-a-certain-time
- Portainer Install Portainer CE with Docker on Linux https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Docker Docs: View container logs https://docs.docker.com/engine/logging/
- Docker Docs: docker container stop https://docs.docker.com/reference/cli/docker/container/stop/
- Docker Docs: docker container start https://docs.docker.com/reference/cli/docker/container/start
- NGINX Docs: WebSocket proxying https://nginx.org/en/docs/http/websocket.html

## Issues Found
1. **Backup command wrote the archive to an ephemeral container path**: The original command created `/tmp/portainer-backup.tar.gz` inside a short-lived Alpine container, so the backup disappeared when the container exited. I changed it to mount the current host directory and write `portainer-data-backup.tar.gz` there.

2. **Database reset note was inaccurate about what survives**: Portainer stores its configuration and stack metadata in `/data`, and Portainer’s own backup documentation says that data includes users, settings, endpoints, and stack-related records. I updated the note to explain that creating a fresh `portainer.db` resets that Portainer state and should only be done when the operator can restore or redeploy afterward.

3. **Reverse-proxy example was incomplete for Portainer WebSocket traffic**: I updated the Nginx snippet to proxy the `/api/websocket/` path explicitly, forward the upgrade headers using the standard Nginx form, and include `proxy_read_timeout 3600`, which Portainer documents as relevant for proxied console/WebSocket sessions.

4. **A few diagnostics were stated too absolutely**: The intro and some console/log guidance implied certainty that is not guaranteed across Portainer versions and deployment layouts. I softened those lines to “common causes”, “likely”, and version-agnostic log categories while preserving the original troubleshooting flow.

## Review Notes
- Portainer currently defaults to HTTPS on port `9443`; port `9000` is retained for legacy HTTP use. The post’s reverse-proxy snippet remains valid when the upstream proxy target is Portainer’s internal HTTP listener on `9000`.

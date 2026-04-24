# Validation Summary: How to Deploy Mattermost via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Mattermost Team Edition
- PostgreSQL
- Mattermost incoming webhooks
- SMTP email configuration

## Sources Consulted
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Mattermost Docker deployment guide: https://docs.mattermost.com/deployment-guide/server/containers/install-docker.html
- Mattermost software and hardware requirements: https://docs.mattermost.com/deployment-guide/software-hardware-requirements.html
- Mattermost environment configuration settings: https://docs.mattermost.com/administration-guide/configure/environment-configuration-settings.html
- Mattermost authentication configuration settings: https://docs.mattermost.com/administration-guide/configure/authentication-configuration-settings.html
- Mattermost site configuration settings: https://docs.mattermost.com/administration-guide/configure/site-configuration-settings.html
- Mattermost incoming webhooks documentation: https://docs.mattermost.com/integrations-guide/incoming-webhooks.html
- Mattermost create channels documentation: https://docs.mattermost.com/end-user-guide/collaborate/create-channels.html

## Issues Found
- The Compose snippet used the obsolete top-level `version: "3.8"` field. It was removed to match the current Compose specification.
- The email security environment variable was misspelled as `MM_EMAILSETTINGS_CONNECTIONSCECURITY`. It was corrected to `MM_EMAILSETTINGS_CONNECTIONSECURITY`, which is the documented Mattermost setting name.
- Self-hosted Mattermost disables email invitations by default. Because the post instructs readers to invite team members by email, I added `MM_SERVICESETTINGS_ENABLEEMAILINVITATIONS: "true"` so the example configuration matches the documented default behavior.
- The stack configured SMTP username and password but did not enable SMTP authentication. I added `MM_EMAILSETTINGS_ENABLESMTPAUTH: "true"` so the example matches Mattermost's documented email configuration behavior.
- `MM_SERVICESETTINGS_SITEURL` was set to `https://chat.example.com` while the example deployment exposed Mattermost directly on port `8065` over HTTP. I changed the Site URL, initial access instruction, and webhook example to use `http://chat.example.com:8065` so the deployment example is internally consistent and matches Mattermost's requirement that Site URL reflect the real access URL, including the port when it is not `80` or `443`.
- The incoming webhook navigation path was updated to `Product Menu > Integrations > Incoming Webhooks > Add Incoming Webhook` to match current Mattermost documentation.

## Review Notes
- The post is technically correct for a direct Portainer-managed deployment that exposes Mattermost on `8065` without a reverse proxy.
- If the deployment is later placed behind NGINX, Traefik, or another TLS terminator, `MM_SERVICESETTINGS_SITEURL` and example webhook URLs should be changed to the external `https://` address.
- `postgres:16-alpine` is within Mattermost's supported PostgreSQL range as of 2026-04-24.
- The `mattermost/mattermost-team-edition:latest` image tag is valid, but it will track new releases over time. Pinning a tested version would make the guide more reproducible in a future revision.

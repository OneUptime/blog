# Validation Summary: How to Deploy Nextcloud via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Docker stacks
- Nextcloud
- PostgreSQL
- Redis
- Traefik
- PHP
- ONLYOFFICE / Collabora Office integration

## Sources Consulted
- Nextcloud Docker image README: https://github.com/nextcloud/docker
- Nextcloud Docker examples: https://github.com/nextcloud/docker/tree/master/.examples
- Nextcloud Docker latest image tag (`latest.txt`): https://raw.githubusercontent.com/nextcloud/docker/master/latest.txt
- Nextcloud maintenance and release schedule: https://github.com/nextcloud/server/wiki/Maintenance-and-Release-Schedule
- Nextcloud system requirements: https://docs.nextcloud.com/server/latest/admin_manual/installation/system_requirements.html
- Nextcloud `occ` command docs: https://docs.nextcloud.com/server/latest/admin_manual/occ_command.html
- Nextcloud apps / background jobs / config commands: https://docs.nextcloud.com/server/latest/admin_manual/occ_apps.html
- Nextcloud files commands: https://docs.nextcloud.com/server/latest/admin_manual/occ_files.html
- Nextcloud system and maintenance commands: https://docs.nextcloud.com/server/latest/admin_manual/occ_system.html
- Nextcloud memory caching docs: https://docs.nextcloud.com/server/stable/admin_manual/configuration_server/caching_configuration.html
- Nextcloud big file upload / PHP settings docs: https://docs.nextcloud.com/server/latest/admin_manual/configuration_files/big_file_upload_configuration.html
- Nextcloud reverse proxy docs: https://docs.nextcloud.com/server/stable/admin_manual/configuration_server/reverse_proxy_configuration.html
- Traefik router docs: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/router/
- Traefik RedirectRegex docs: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/redirectregex/
- ONLYOFFICE Nextcloud integration guide: https://helpcenter.onlyoffice.com/integration/nextcloud.aspx
- Nextcloud Office docs: https://docs.nextcloud.com/server/latest/admin_manual/office/index.html

## Issues Found
- The stack pinned `nextcloud:29-apache`, which is end-of-life according to Nextcloud's release schedule. Updated both app and cron containers to `nextcloud:33-apache`.
- The Redis container required a password, but the Nextcloud app service did not set `REDIS_HOST_PASSWORD`. Added the missing environment variable so authenticated Redis works with the official Nextcloud image's auto-configuration.
- The Redis `occ config:system:set` example was incomplete and misleading for this stack, because the official image already auto-configures Redis from environment variables and the original commands omitted the Redis password. Replaced that block with `occ config:list system`, which matches the image documentation for viewing merged runtime config.
- The Traefik labels defined a redirect middleware but never attached it to the router, so the CardDAV/CalDAV redirect would not run. Added the router-to-middleware binding and `permanent=true`.
- The description and conclusion overstated what the stack deploys by default. Updated the wording to match the actual stack and noted that collaborative document editing also needs a compatible document server.

## Review Notes
- The post still uses a pinned major Nextcloud tag, which is reasonable for a tutorial, but it will age. Revalidating the image tag periodically is advisable.
- `NEXTCLOUD_UPDATE: 1` is not required when using the default `apache-foreground` command, but it is harmless.
- The PHP settings shown are consistent with Nextcloud guidance for large uploads, though production deployments may also need reverse-proxy and web-server timeout tuning depending on upload size.

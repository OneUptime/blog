# Validation Summary: How to Self-Host a File Sync Service with Portainer

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Nextcloud
- PostgreSQL
- Redis
- Traefik
- SMTP
- Amazon S3 external storage

## Sources Consulted
- Nextcloud Docker image README: https://github.com/nextcloud/docker
- Nextcloud Docker version metadata: https://github.com/nextcloud/docker/blob/master/versions.json
- Nextcloud Docker latest version marker: https://github.com/nextcloud/docker/blob/master/latest.txt
- Nextcloud documentation overview: https://docs.nextcloud.com/
- Nextcloud Administration Manual, reverse proxy configuration: https://docs.nextcloud.com/server/stable/admin_manual/configuration_server/reverse_proxy_configuration.html
- Nextcloud Administration Manual, apps/background job OCC commands: https://docs.nextcloud.com/server/latest/admin_manual/occ_apps.html
- Nextcloud Administration Manual, files/external storage OCC commands: https://docs.nextcloud.com/server/latest/admin_manual/occ_files.html
- Nextcloud Administration Manual, memory caching: https://docs.nextcloud.com/server/stable/admin_manual/configuration_server/caching_configuration.html
- Nextcloud Administration Manual, backups: https://docs.nextcloud.com/server/30/admin_manual/maintenance/backup.html
- Docker Compose version element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Traefik Docker provider labels: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik RedirectRegex middleware: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/redirectregex/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/

## Issues Found
- The post pinned `nextcloud:27-apache`, which is no longer a current supported image line. I updated both Nextcloud services to `nextcloud:33-apache` based on the current official Docker image metadata.
- The storage preparation step created `/opt/nextcloud/data`, but the stack actually mounted `/mnt/data/nextcloud` as the data directory. I aligned the host directory setup with the mounted paths.
- The Redis health check used `redis-cli ping` even though Redis authentication was enabled. I updated the health check to authenticate with the configured password so the container can become healthy.
- The stack raised PHP upload limits to 10G but left Apache's request-body limit at its default 1 GiB. I added `APACHE_BODY_LIMIT=10737418240` so large uploads are not blocked by Apache first.
- The Traefik CalDAV/CardDAV redirect middleware was defined but never attached to the router. I attached it and aligned the regex/replacement with the current Nextcloud reverse proxy guidance.
- The HTTPS/reverse-proxy prerequisites were underspecified for a Traefik-based SSL deployment. I clarified that the SSL path assumes a reverse proxy and added the corresponding Nextcloud reverse-proxy environment settings.
- The performance section said it was configuring Redis for distributed caching, but the command shown only set `memcache.locking`. I corrected the description to match the actual command.
- The `occ files_external:create` example used an invalid argument order and auth backend. I corrected it to a valid mount-point-first command using `builtin::builtin`, matching the current OCC documentation.
- The backup script only archived the config directory and database, while the article claimed regular backups of user data. I expanded the script to back up custom apps and the actual user data directory.

## Review Notes
- The top-level Compose `version` key is obsolete in modern Compose, but Docker still accepts it for backward compatibility, so I left it unchanged.
- `TRUSTED_PROXIES` should be adjusted to the actual Docker network or proxy IP range used in deployment.
- The official Nextcloud docs currently document Nextcloud 33 as the stable line and 34 as the upcoming release. The Docker image itself is community-maintained, and the image README recommends Nextcloud AIO for the easiest Docker-based deployment path.

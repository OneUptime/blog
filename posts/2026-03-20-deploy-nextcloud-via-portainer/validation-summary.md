# Validation Summary: How to Deploy Nextcloud via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Nextcloud
- Portainer
- Docker Compose
- MariaDB
- OneUptime

## Sources Consulted
- Nextcloud Docker image README: https://github.com/nextcloud/docker/blob/master/README.md
- Nextcloud Docker Hub image tags and overview: https://hub.docker.com/_/nextcloud/
- Nextcloud maintenance and release schedule: https://github.com/nextcloud/server/wiki/Maintenance-and-Release-Schedule
- Nextcloud system requirements: https://docs.nextcloud.com/server/stable/admin_manual/installation/system_requirements.html
- Nextcloud database configuration: https://docs.nextcloud.com/server/stable/admin_manual/configuration_database/linux_database_configuration.html
- Nextcloud reverse proxy configuration: https://docs.nextcloud.com/server/stable/admin_manual/configuration_server/reverse_proxy_configuration.html
- Nextcloud `status.php` source: https://raw.githubusercontent.com/nextcloud/server/master/status.php
- Docker Compose Specification reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose startup order / `depends_on`: https://docs.docker.com/compose/how-tos/startup-order/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- OneUptime API monitor docs: https://oneuptime.com/docs/monitor/api-monitor

## Issues Found
- The Compose example pinned `nextcloud:28`, which is an end-of-life major release. I updated it to `nextcloud:33`, which is a currently supported release series as of 2026-05-01.
- The MariaDB service omitted the `READ-COMMITTED` transaction isolation setting that Nextcloud requires for MySQL/MariaDB deployments. I added `command: --transaction-isolation=READ-COMMITTED`.
- The Compose snippet used the top-level `version: "3.8"` field, which is now obsolete under the current Compose Specification. I removed it to avoid an obsolete-field warning.
- The article implied the stack was using a production-ready Compose configuration. The provided stack is a persistent basic deployment, so I reworded the description to avoid overstating what the example provides.
- The deployment section could be read as if `depends_on` waits for MariaDB readiness. I clarified that it only controls startup order.
- The reverse-proxy paragraph referred only to trusted domains even though the example also sets overwrite parameters. I corrected the wording to match what the snippet is actually configuring.
- The OneUptime section treated `status.php` as a simple healthy/unhealthy check and only suggested checking `"installed":true`. I updated it to reflect the actual JSON fields returned by `status.php`, including `maintenance` and `needsDbUpgrade`, and changed the recommended monitor type to an API monitor.
- The update guidance implied you can simply bump to any later major tag. I corrected it to say upgrades should be done one major version at a time and noted the official image's config-file update caveat.

## Review Notes
- `nextcloud:33` was the latest Docker Hub release series on 2026-05-01; Nextcloud 34 was still unreleased on that date, so the post should not recommend it yet.
- MariaDB `10.11` remains within the versions Nextcloud documents as supported/recommended at the time of review.
- The post now describes a minimal persistent deployment more accurately. For broader hardening and scale, the official Nextcloud image documents additional options such as Docker secrets, Redis, and reverse-proxy-specific settings.

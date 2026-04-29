# Validation Summary: How to Deploy Matomo Analytics via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Compose
- Matomo On-Premise
- MariaDB containers
- Cron-based report archiving
- Matomo geolocation
- Matomo email reports
- Matomo Google Analytics import

## Sources Consulted
- Portainer documentation: Add a new stack — https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer documentation: How Relative Path Support works in Portainer — https://docs.portainer.io/sts/advanced-topics/relative-paths
- Matomo documentation: Installing Matomo On-Premise — https://matomo.org/docs/installation/
- Matomo documentation: How to Set up Auto-Archiving of Your Reports — https://matomo.org/docs/setup-auto-archiving/
- Matomo documentation: Setting up accurate visitors geolocation — https://matomo.org/docs/geo-locate/
- Matomo documentation: Schedule Reports — https://matomo.org/docs/email-reports/
- Matomo documentation: How do I send Matomo emails using SMTP server? — https://matomo.org/faq/how-to/faq_93/
- Matomo documentation: Setting up a Google Analytics Import for high traffic websites — https://matomo.org/faq/general/set-up-google-analytics-import/
- Matomo documentation: Running the Google Analytics Import — https://matomo.org/faq/general/running-the-google-analytics-import/
- Matomo official Docker image README — https://github.com/matomo-org/docker/blob/master/README.md
- Matomo official Docker Compose example (Apache) — https://github.com/matomo-org/docker/blob/master/.examples/apache/compose.yml
- Docker Hub official Matomo tags — https://hub.docker.com/_/matomo/tags
- MariaDB documentation: MariaDB Server Docker Official Image Environment Variables — https://mariadb.com/kb/en/mariadb-server-docker-official-image-environment-variables/
- MariaDB documentation: Using `healthcheck.sh` — https://mariadb.com/kb/en/using-healthcheck-sh/

## Issues Found

1. **The optional Nginx reverse-proxy service was not deployable from the Portainer Web Editor flow shown in the post.** The stack used a relative bind mount for `./nginx.conf`, but Portainer documents relative path support only for specific Business Edition Git-based deployments, and the post did not provide an `nginx.conf` file. I removed the broken optional service and clarified the HTTPS prerequisite wording.

2. **The Matomo container used unsupported environment variables.** The official Matomo image documents `MATOMO_DATABASE_HOST`, `MATOMO_DATABASE_ADAPTER`, `MATOMO_DATABASE_USERNAME`, `MATOMO_DATABASE_PASSWORD`, `MATOMO_DATABASE_DBNAME`, `MATOMO_DATABASE_TABLES_PREFIX`, and `PHP_MEMORY_LIMIT`, but not `MATOMO_DATABASE_PORT` or `PHP_MAX_EXECUTION_TIME`. I removed the unsupported variables and added the documented database adapter setting.

3. **The database service configuration lagged behind current official MariaDB container guidance.** MariaDB currently prefers `MARIADB_*` variables over `MYSQL_*` variables for modern tags, and its documented readiness check is `healthcheck.sh`. I updated the compose example to use `mariadb:lts`, `MARIADB_*` variables, and the official health check pattern.

4. **The Matomo image tag was stale.** As of April 29, 2026, the official Docker Hub tags are in the Matomo `5.8` series, while the post pinned `matomo:5.1`. I updated the example to `matomo:5-apache` so it stays on the supported Matomo 5 Apache image line without freezing readers on an older minor release.

5. **The archiving guidance conflicted with Matomo’s official recommendations.** Matomo’s auto-archiving documentation recommends running the archiver every hour, typically at 5 minutes past the hour. I changed the cron example from every 5 minutes to `5 * * * *` and updated the settings text to match the current Matomo UI labels for disabling browser-triggered archiving.

6. **The GeoIP shell command was non-functional as written.** `docker exec -it matomo bash` only opens a shell; it does not download or configure a GeoIP database. I removed that misleading command and kept the supported admin-panel configuration steps.

## Review Notes
- The post now accurately documents a plain Portainer stack that exposes Matomo on port `8080`. If the post later wants end-to-end HTTPS inside the same stack, it would need a complete reverse-proxy example with a real config file and certificate/key handling.
- The compose file still uses placeholder passwords for illustration. Readers should replace them with real secrets before deployment.
- Matomo’s auto-archiving docs still show older examples with `--url`, while the current CLI help also exposes `--matomo-domain`. The updated post uses `--matomo-domain`.

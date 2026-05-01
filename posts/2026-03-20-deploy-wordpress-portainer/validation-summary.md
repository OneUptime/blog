# Validation Summary: How to Deploy WordPress via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- WordPress
- Docker Compose
- Traefik
- MySQL
- Redis
- WP-CLI
- PHP

## Sources Consulted
- Docker Official Image for WordPress: https://hub.docker.com/_/wordpress
- Docker Compose file reference, version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Compose Specification (`depends_on` with `service_healthy`): https://compose-spec.github.io/compose-spec/spec.html
- Docker Compose interpolation reference: https://docs.docker.com/reference/compose-file/interpolation/
- Docker Official Image for MySQL: https://hub.docker.com/_/mysql
- MySQL `mysqladmin` reference: https://dev.mysql.com/doc/refman/en/mysqladmin.html
- Traefik TLS router documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/tls/overview/
- Traefik Docker routing labels (`traefik.docker.network`): https://doc.traefik.io/traefik/v2.10/routing/providers/docker/
- Docker `exec` CLI reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker `cp` CLI reference: https://docs.docker.com/reference/cli/docker/container/cp/
- WP-CLI installation guide: https://make.wordpress.org/cli/handbook/guides/installing/
- WP-CLI v2.5.0 release notes (`WP_CLI_ALLOW_ROOT`): https://make.wordpress.org/cli/2021/05/19/wp-cli-v2-5-0-release-notes/
- WP-CLI `wp cache` command reference: https://developer.wordpress.org/cli/commands/cache/
- Redis Object Cache plugin page: https://wordpress.org/plugins/redis-cache/
- Redis Object Cache official repository/configuration reference: https://github.com/rhubarbgroup/redis-cache

## Issues Found
- The stack pinned `wordpress:6.5-apache`, which is outdated relative to the current official WordPress image tags. I updated it to `wordpress:6.9-apache`.
- The Compose snippet used the top-level `version: "3.8"` key. Docker’s current Compose documentation marks the `version` field as obsolete, so I removed it.
- The post set `WORDPRESS_DEBUG=false`. In the official WordPress image, any non-empty `WORDPRESS_DEBUG` value enables `WP_DEBUG`, so `false` would still turn debug mode on. I removed the line so debug stays disabled by default.
- The Traefik labels omitted `traefik.http.routers.wordpress.tls=true`. Traefik’s TLS router documentation requires TLS to be enabled on the router for HTTPS/certificate resolver behavior, so I added it.
- The WordPress service is attached to both `proxy` and `backend`, but the labels did not specify `traefik.docker.network`. Traefik’s Docker routing docs warn that with multiple networks it may pick one at random, so I added `traefik.docker.network=proxy`.
- The environment variable examples were written with spaces around `=`. That is not standard `.env`/Compose assignment syntax, so I normalized them to `KEY=value`.
- The WP-CLI section assumed commands would run cleanly in the container shell as root. WP-CLI’s official release notes document `WP_CLI_ALLOW_ROOT`, so I added `export WP_CLI_ALLOW_ROOT=1` for Portainer console sessions opened as root.
- The `wp cache flush` comment said it flushes “Redis cache”. The official WP-CLI command reference defines it as flushing the WordPress object cache, so I corrected the wording.
- The backup commands used `docker exec mysql` and `docker cp wordpress:...`, which rely on service names being valid container names, and they referenced database credentials from the host shell rather than inside the container. I changed them to use explicit container-name placeholders and a container-side `sh -c` command that reads the MySQL environment variables correctly.
- The performance table described Redis Object Cache as “Database query caching”. The plugin’s official documentation describes it as a persistent object cache backend, so I corrected that wording.

## Review Notes
- The compose example is valid for Compose-style deployments in Portainer. It is not a Swarm-oriented stack example, because it relies on a bridge network and Compose-specific startup semantics.
- The Traefik labels still assume an external Docker network named `proxy` already exists and that a `letsencrypt` certificate resolver is defined in Traefik’s static configuration.
- The WP-CLI installation method works for an interactive container session, but installing tools directly inside a running container is ephemeral and will be lost when the container is recreated.

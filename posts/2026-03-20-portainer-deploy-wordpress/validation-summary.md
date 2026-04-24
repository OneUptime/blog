# Validation Summary: How to Deploy WordPress via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- WordPress
- MySQL
- Redis
- Traefik
- PHP configuration

## Sources Consulted
- Portainer stack deployment docs - https://docs.portainer.io/user/docker/stacks/add
- Portainer relative path support docs - https://docs.portainer.io/sts/advanced/relative-paths
- Docker Compose version and name reference - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose volumes reference - https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose startup order reference - https://docs.docker.com/compose/how-tos/startup-order/
- WordPress download page - https://wordpress.org/download/
- WordPress Docker Official Image docs - https://hub.docker.com/_/wordpress/
- MySQL Docker Official Image docs - https://hub.docker.com/_/mysql
- WordPress `wp-config.php` documentation - https://developer.wordpress.org/advanced-administration/wordpress/wp-config/
- WordPress core update configuration docs - https://developer.wordpress.org/advanced-administration/upgrade/upgrading/
- WordPress HTTPS and reverse proxy docs - https://developer.wordpress.org/advanced-administration/security/https/
- WordPress `xmlrpc_enabled` hook reference - https://developer.wordpress.org/reference/hooks/xmlrpc_enabled/
- WordPress `wp_generator()` reference - https://developer.wordpress.org/reference/functions/wp_generator/
- Traefik Docker provider docs - https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/

## Issues Found
- The Compose example used `version: "3.8"`, but Docker now documents the top-level `version` field as obsolete. I removed it.
- The pinned WordPress image `wordpress:6.5-php8.3-apache` was outdated. I updated it to `wordpress:6.9.4-php8.3-apache`, which matches the current stable WordPress release and current official image tags as of April 24, 2026.
- The stack mounted `./uploads.ini`, which is not a generally valid Portainer stack pattern unless you are using Portainer Business Edition Git deployments with relative path support enabled. I changed the example to an absolute host-path mount and updated the PHP configuration text to match.
- The backup section referred to `wordpress_data`, but Compose normally scopes named volumes with the project or stack name. I added explicit `name:` entries for the two volumes so the backup commands match the deployed volume names.
- The security hardening snippet placed `add_filter()` and `remove_action()` code inside `WORDPRESS_CONFIG_EXTRA`, which is evaluated in `wp-config.php`. WordPress explicitly documents that hook-based filter code should not be added directly in `wp-config.php`. I replaced that snippet with `wp-config.php`-safe settings and corrected the mistaken comment that described `WP_AUTO_UPDATE_CORE` as login-attempt limiting.
- Because the post also shows a Traefik reverse-proxy setup, the `FORCE_SSL_ADMIN` guidance needed the documented `HTTP_X_FORWARDED_PROTO` handling so WordPress can detect HTTPS correctly behind the proxy. I added that logic and used `$$` so the code survives Compose interpolation.
- The Traefik example referenced `traefik-public` without declaring the external network, and the container was attached to two networks without pinning Traefik to the correct one. I added the required top-level network definition and the `traefik.docker.network=traefik-public` label Traefik documents for multi-network containers.

## Review Notes
- The MySQL environment variables, healthcheck syntax, Redis `--requirepass` command, and backup command syntax were reviewed against current official documentation and did not require changes.
- The post still uses placeholder passwords in environment variables. That is workable for an example, but both the WordPress and MySQL official images support `_FILE` variants for secret-file based configuration, which would be a stronger production pattern in a future revision.
- Docker is not installed in this workspace, so the Compose snippets and shell commands were validated against the current official documentation rather than executed locally.

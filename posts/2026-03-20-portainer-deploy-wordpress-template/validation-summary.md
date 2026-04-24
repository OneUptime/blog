# Validation Summary: How to Deploy WordPress Using a Portainer Template

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Official Images
- WordPress
- MySQL
- Traefik
- Reverse proxies

## Sources Consulted
- Portainer documentation: https://docs.portainer.io/user/docker/templates
- Portainer documentation, Deploy a stack: https://docs.portainer.io/user/docker/templates/deploy-stack
- Portainer official templates metadata: https://raw.githubusercontent.com/portainer/templates/v3/templates.json
- Portainer official WordPress template Compose file: https://raw.githubusercontent.com/portainer/templates/v3/stacks/wordpress/docker-compose.yml
- Docker Official Image documentation for WordPress: https://github.com/docker-library/docs/blob/master/wordpress/README.md
- Docker Official Image documentation for MySQL: https://hub.docker.com/_/mysql
- Docker Compose services reference (`ports` short syntax): https://docs.docker.com/reference/compose-file/services/
- WordPress Advanced Administration Handbook, HTTPS and reverse proxies: https://developer.wordpress.org/advanced-administration/security/https/
- MySQL Reference Manual, Backup and Recovery: https://dev.mysql.com/doc/refman/8.4/en/backup-and-recovery.html
- MySQL Reference Manual, Using mysqldump for Backups: https://dev.mysql.com/doc/refman/8.4/en/using-mysqldump.html
- Wordfence plugin directory entry: https://wordpress.org/plugins/wordfence/
- UpdraftPlus plugin directory entry: https://wordpress.org/plugins/updraftplus/
- WP Super Cache plugin directory entry: https://wordpress.org/plugins/wp-super-cache/
- Yoast SEO plugin directory entry: https://wordpress.org/plugins/wordpress-seo/

## Issues Found
- The post described the current Portainer UI as **App Templates**, but current Portainer documentation uses **Templates → Application**. I updated the navigation steps to match the documented UI.
- The template-variable list was inaccurate. The current official Portainer WordPress stack template exposes only one variable, `MYSQL_DATABASE_PASSWORD` / “Database root password”, not custom WordPress port and database fields. I replaced the example values with the actual template inputs.
- The deployment details were incorrect. The current official template creates one default stack network, creates a `db_data` volume, and pulls `wordpress:latest` with `mysql:5.7`. I corrected the deployment description to match the official template Compose file.
- The post told readers to browse to port `80`, but the official template uses `ports: - 80`, which publishes container port `80` to an automatically assigned host port. I changed the instructions to use the published port and noted how to find it.
- The “Set the Correct URL” snippet was labeled as PHP even though it was plain settings text. I changed the code fence to `text`.
- The reverse-proxy section said extra `WORDPRESS_CONFIG_EXTRA` was required. The official WordPress image documentation states that when the proxy sets `X-Forwarded-Proto` correctly, the image already handles that header in `wp-config.php` when WordPress DB environment variables are provided. I removed the unnecessary snippet and corrected the guidance.
- The persistent-storage example showed both full-site persistence and uploads-only persistence enabled at the same time. I changed the uploads-only example to a commented alternative so the YAML matches the intended “choose one” behavior.
- The backup service mounted the live MySQL data directory and implied a tarball backup of it. That is not an appropriate example for a running MySQL server. I changed the service example to back up WordPress files only and corrected the database backup command to use `mysqldump`.
- The manual database backup command incorrectly relied on host-side expansion of `${MYSQL_PASSWORD}` and used a hard-coded container name pattern that is not guaranteed. I replaced it with a `docker exec -i ... sh -c 'mysqldump ...'` form that uses the container’s environment variables.
- The update example pinned `wordpress:6.4`, which is outdated relative to the current official WordPress image tags as of April 24, 2026. I updated the example to `wordpress:6.9.4`.

## Review Notes
- The current official Portainer WordPress template still points to `mysql:5.7`. The post now reflects that template accurately, but production deployments should replace it with a currently supported MySQL image when customizing the stack.

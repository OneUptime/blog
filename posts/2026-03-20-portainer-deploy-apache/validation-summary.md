# Validation Summary: How to Deploy Apache HTTP Server via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Apache HTTP Server 2.4
- PHP-FPM
- Apache `mod_proxy_fcgi`
- Apache `mod_rewrite`
- TLS/SSL
- WordPress

## Sources Consulted
- Portainer documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer relative path volumes documentation: https://docs.portainer.io/sts/advanced/relative-paths
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose `version` reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Official `httpd` image documentation: https://hub.docker.com/_/httpd
- Apache `mod_proxy_fcgi` documentation: https://httpd.apache.org/docs/current/mod/mod_proxy_fcgi.html
- Apache `mod_dir` documentation: https://httpd.apache.org/docs/2.4/mod/mod_dir.html
- Apache `mpm_common` (`Listen`) documentation: https://httpd.apache.org/docs/current/mod/mpm_common.html
- Apache `mod_ssl` documentation: https://httpd.apache.org/docs/current/en/mod/mod_ssl.html
- Apache `httpd` program documentation: https://httpd.apache.org/docs/current/en/programs/httpd.html
- WordPress Apache / `.htaccess` documentation: https://developer.wordpress.org/advanced-administration/server/web-server/httpd/

## Issues Found
- The stack example used relative bind mounts like `./httpd.conf` and `./www`. Portainer documents relative path volume support only for Business Edition Git-based deployments, so these paths were changed to absolute host paths to make the example work in a standard Portainer stack workflow.
- The Compose snippet used the obsolete top-level `version` field. It was removed because current Compose implementations always use the latest schema and warn that `version` is obsolete.
- The Apache configuration only declared `Listen 80` even though the guide defines an HTTPS virtual host on `*:443`. `Listen 443` was added so the SSL virtual host can actually accept traffic.
- The custom `httpd.conf` omitted `mod_dir` and any `DirectoryIndex` setting. That can prevent typical `index.php` and `index.html` front controllers from being served correctly, so `dir_module` and `DirectoryIndex index.php index.html` were added.
- The PHP-FPM proxy examples pointed Apache at `php-fpm`, which matched the custom container name rather than the Compose service name. The handler target was changed to `php:9000`, which is the portable hostname Docker Compose guarantees on the default network.

## Review Notes
- The example remains valid for Docker Standalone stacks in Portainer. If readers adapt it for Docker Swarm, some Compose fields such as `container_name` are less portable and should be reviewed separately.

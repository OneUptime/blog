# Validation Summary: How to Run LiteSpeed Web Server in Docker

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Docker
- Docker Compose
- OpenLiteSpeed / LiteSpeed Web Server
- LSPHP / PHP LSAPI
- PHP PDO with MySQL
- WordPress
- LiteSpeed Cache
- Redis
- Let's Encrypt / ACME certificates
- HTTP/3 / QUIC
- wrk and ApacheBench benchmarking

## Sources Consulted
- OpenLiteSpeed Docker documentation: https://docs.litespeedtech.com/cloud/docker/openlitespeed/
- Official OpenLiteSpeed Dockerfiles repository: https://github.com/litespeedtech/ols-dockerfiles
- Official OpenLiteSpeed Docker environment repository: https://github.com/litespeedtech/ols-docker-env
- OpenLiteSpeed command documentation: https://docs.openlitespeed.org/commands/
- OpenLiteSpeed rewrite rules documentation: https://docs.openlitespeed.org/config/rewriterules/
- OpenLiteSpeed access control documentation: https://docs.openlitespeed.org/security/access/
- LiteSpeed Cache no-plugin configuration documentation: https://docs.litespeedtech.com/lscache/noplugin/settings/
- OpenLiteSpeed LSCache configuration documentation: https://docs.openlitespeed.org/config/lscache/
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- LiteSpeed Web Server license documentation: https://docs.litespeedtech.com/licenses/products/lsws/
- WordPress download endpoint: https://wordpress.org/latest.tar.gz

## Issues Found
- The OpenLiteSpeed image tag was outdated (`1.7.19-lsphp83`). Updated examples to the current official pinned image shown in the upstream Dockerfiles README (`1.8.5-lsphp85`) and updated the PHP configuration path accordingly.
- HTTP/3 support was mentioned, but Docker examples only published TCP 443. Added `443:443/udp` to `docker run` and Compose examples so QUIC/HTTP/3 traffic can reach the container.
- The post stated default WebAdmin credentials of `admin` / `123456`. Current OpenLiteSpeed documentation recommends setting or resetting the WebAdmin password with `/usr/local/lsws/admin/misc/admpass.sh`; updated the instructions to use that command instead of publishing obsolete credentials.
- The Docker Compose examples used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification.
- The virtual host snippet attempted to deny `.git` and `.env` using `allowBrowse 0`, which controls browsing rather than reliably denying direct file access. Replaced it with a rewrite rule returning forbidden access.
- The LiteSpeed Cache `.htaccess` example used `CacheLookup on`; the documented syntax is `CacheLookup public on`. Updated the directive and added `RewriteEngine On` to make the rewrite-rule example complete.

## Review Notes
- Docker Hub pulls could not be verified locally because the environment hit Docker Hub's unauthenticated pull rate limit. Official LiteSpeed documentation and GitHub repositories were used instead.
- The SSL section uses certbot, while LiteSpeed's official Docker environment uses ACME helper scripts. The certbot webroot command is plausible, but a production setup should also mount certificate storage persistently and configure the LiteSpeed listener/vhost SSL paths.

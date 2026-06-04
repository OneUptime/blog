# Validation Summary: How to Run Squid Proxy in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Squid proxy
- Squid access control lists
- Squid caching directives
- Squid basic authentication
- Squid SSL bumping
- curl
- htpasswd

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Canonical ubuntu/squid image documentation: https://hub.docker.com/r/ubuntu/squid
- Squid http_port directive: https://www.squid-cache.org/Doc/config/http_port/
- Squid http_access directive: https://www.squid-cache.org/Doc/config/http_access/
- Squid acl directive: https://www.squid-cache.org/Doc/config/acl/
- Squid cache_dir directive: https://www.squid-cache.org/Doc/config/cache_dir/
- Squid refresh_pattern directive: https://www.squid-cache.org/Doc/config/refresh_pattern/
- Squid auth_param directive: https://www.squid-cache.org/Doc/config/auth_param/
- Squid ssl_bump directive: https://www.squid-cache.org/Doc/config/ssl_bump/
- Squid sslcrtd_program directive: https://www.squid-cache.org/Doc/config/sslcrtd_program/
- Squid forwarded_for directive: https://www.squid-cache.org/Doc/config/forwarded_for/
- Squid via directive: https://www.squid-cache.org/Doc/config/via/
- Apache htpasswd documentation: https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html
- curl proxy option documentation: https://github.com/curl/curl/blob/master/docs/MANUAL.md

## Issues Found
- Removed obsolete `version: "3.8"` lines from Docker Compose examples. Current Docker Compose uses the Compose Specification and no longer requires a top-level version field.
- Corrected the package caching description to specify HTTP package downloads. Standard HTTPS proxying uses CONNECT tunneling, so Squid cannot cache encrypted package contents unless HTTPS interception is configured.
- Removed the Docker layer caching `refresh_pattern`. Docker registry layer downloads are normally HTTPS traffic, so Squid cannot cache those blobs through a normal forward proxy.
- Clarified that pip HTTPS traffic may use the proxy but is tunneled unless SSL bump is configured.
- Renamed the Docker network section from transparent proxying to explicit proxying because the example configures `HTTP_PROXY` and `HTTPS_PROXY` environment variables rather than NAT/intercept mode.
- Fixed the content filtering example by moving domain and URL deny rules before the local network allow rule. Squid uses the first matching `http_access` rule, so the original order allowed local clients before block rules were evaluated.
- Replaced the cache-clearing command sequence. Shutting down Squid in the container before subsequent `docker exec` commands can stop the container, so the revised commands stop the Compose service, clear and initialize the cache volume with a one-off container, then start Squid again.
- Updated the SSL bump section to note that the current `ubuntu/squid:latest` image does not support the `ssl-bump` listener option, based on runtime validation against Squid 6.13 from that image.
- Replaced the SSL bump `cert=` option with the current Squid `tls-cert=` option documented for `http_port`.

## Review Notes
- Verified the default `ubuntu/squid:latest` container accepts HTTP proxy requests on port 3128.
- Parsed the non-SSL Squid configuration snippets with Squid 6.13 from `ubuntu/squid:latest`.
- SSL bump remains a compatible-build example only; it should not be expected to work with the Canonical image used by the rest of the tutorial unless that image changes its build options.

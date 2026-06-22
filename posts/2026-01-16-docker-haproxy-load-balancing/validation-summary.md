# Validation Summary: How to Load Balance Docker Containers with HAProxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- HAProxy 2.8
- HAProxy health checks, ACLs, stick tables, stats, and Prometheus exporter
- TLS termination and certificate files
- Certbot / Let's Encrypt
- Keepalived

## Sources Consulted
- HAProxy 2.8 Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Docker Engine networking overview: https://docs.docker.com/engine/network/
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- osixia/keepalived container documentation: https://github.com/osixia/docker-keepalived

## Issues Found
- Removed obsolete top-level `version: '3.8'` declarations from Docker Compose examples because current Docker Compose treats the `version` key as backward-compatible but obsolete.
- Corrected the HAProxy stats password example from `stats auth admin:${STATS_PASSWORD}` to `stats auth "admin:${STATS_PASSWORD}"`, because HAProxy expands environment variables only inside double quotes.
- Updated the Let's Encrypt example so HAProxy reads from `/etc/letsencrypt`, matching where the Certbot container writes certificate material, and so Certbot creates a combined `haproxy.pem` file from `fullchain.pem` and `privkey.pem`.
- Fixed the production Docker Compose example so its services are named `api1`, `api2`, `api3`, `web1`, and `web2`, matching the HAProxy backend server names. The previous `api` and `web` services with replicas did not create the hostnames used in the HAProxy config.
- Added `depends_on` entries to the production HAProxy service so Docker Compose creates backend service containers before starting HAProxy.
- Reworked the Keepalived Compose example to use host networking for HAProxy and Keepalived, and added the documented `NET_RAW` and `NET_BROADCAST` capabilities required by the `osixia/keepalived` image. Also changed Keepalived list-style environment variables to the documented `#PYTHON2BASH` format.

## Review Notes
- Verified all YAML code blocks with `docker compose config`.
- Verified the complete production HAProxy configuration with `haproxy:2.8` using a generated dummy combined PEM file and host entries for the Compose service names.
- The Certbot example still assumes HAProxy is configured to serve the HTTP-01 webroot challenge path.

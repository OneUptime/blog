# Validation Summary: How to Deploy Bookstack via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- BookStack (self-hosted documentation/wiki platform)
- Portainer (Docker container management)
- Docker Compose
- MySQL 8.0
- linuxserver/bookstack Docker image
- LDAP / Active Directory integration

## Sources Consulted
- BookStack official LDAP documentation: https://www.bookstackapp.com/docs/admin/ldap-auth/
- linuxserver.io BookStack image docs: https://docs.linuxserver.io/images/docker-bookstack/
- Docker Hub linuxserver/bookstack: https://hub.docker.com/r/linuxserver/bookstack
- Docker Compose file format reference: https://docs.docker.com/compose/compose-file/
- MySQL 8.0 Docker image: https://hub.docker.com/_/mysql

## Issues Found
- **LDAP environment variable names were incorrect.** The post used `LDAP_ATTRIBUTE_ID` and `LDAP_ATTRIBUTE_EMAIL`, but BookStack's actual environment variable names are `LDAP_ID_ATTRIBUTE` and `LDAP_EMAIL_ATTRIBUTE` (the words are in the opposite order). Updated the LDAP yaml snippet to use the correct variable names so the configuration would actually take effect.

## Review Notes
- The default BookStack admin credentials (`admin@admin.com` / `password`) are correct for a fresh install — the post correctly warns the user to change them immediately.
- The linuxserver/bookstack image's volume mount path `/config` and the `PUID`/`PGID` environment variables are standard linuxserver.io conventions and are correct.
- Database connection variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_DATABASE`) match linuxserver/bookstack's documented variables.
- Container internal port 80 mapped to host port 6875 (`6875:80`) matches the linuxserver/bookstack image's exposed port — note that some recent versions of the image have switched to exposing port 80 differently in newer tags; the `:latest` tag works as described at the time of writing.
- Using `depends_on` without a `condition: service_healthy` health check means BookStack may start before MySQL is ready to accept connections. BookStack/linuxserver's entrypoint has retry logic that handles this in practice, but adding a healthcheck would be more robust.
- The `APP_URL` should match how users actually access BookStack (including the port if the port is part of the access URL); the example value is sensible.
- Pinning `linuxserver/bookstack:latest` is convenient but reproducibility-poor — pinning to a specific tag is generally recommended for production. Not a technical error, just a future improvement.

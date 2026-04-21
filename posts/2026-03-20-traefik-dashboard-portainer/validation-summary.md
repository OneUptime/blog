# Validation Summary: How to Set Up Traefik Dashboard Alongside Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Traefik v3
- Traefik API and dashboard
- Traefik Docker provider labels
- Traefik BasicAuth and IPAllowList middlewares
- Traefik ACME / Let's Encrypt certificate resolvers
- Portainer CE
- Docker Compose
- Apache `htpasswd`
- `curl` and `jq`

## Sources Consulted
- Traefik v3.0 Dashboard documentation: https://doc.traefik.io/traefik/v3.0/operations/dashboard/
- Traefik v3.0 API documentation: https://doc.traefik.io/traefik/v3.0/operations/api/
- Traefik BasicAuth middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/basicauth/
- Traefik v3.0 IPAllowList middleware documentation: https://doc.traefik.io/traefik/v3.0/middlewares/http/ipallowlist/
- Traefik v3.0 Docker provider documentation: https://doc.traefik.io/traefik/v3.0/providers/docker/
- Traefik v3.0 Let's Encrypt / ACME documentation: https://doc.traefik.io/traefik/v3.0/https/acme/
- Apache HTTP Server `htpasswd` documentation: https://httpd.apache.org/docs/current/en/programs/htpasswd.html
- Docker Compose file reference for `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer CE Docker installation documentation: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer requirements and ports documentation: https://docs.portainer.io/start/requirements-and-prerequisites

## Issues Found
- The Basic Auth section said to generate a bcrypt password hash but used `htpasswd -nb admin yourpassword`, which defaults to Apache MD5 in current Apache `htpasswd`. Changed it to `htpasswd -nB admin` and updated the sample output from `$apr1$...` to `$2y$...`.
- The Docker label placeholder for Basic Auth used an Apache MD5-style escaped hash (`$$apr1$$...`) while the section recommends bcrypt. Updated it to a bcrypt-style escaped placeholder (`$$2y$$05$$...`).
- The dashboard access instructions pointed users to the domain root. Traefik documents the dashboard at `/dashboard/` with a mandatory trailing slash and warns not to rely on the root redirect. Updated the router rule to explicitly match `/api` and `/dashboard`, and updated the access URL to `https://traefik.yourdomain.com/dashboard/`.
- The combined Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it to match the current Docker Compose Specification.

## Review Notes
- The examples assume the `websecure` entry point, `letsencrypt` certificate resolver, and Docker provider are already configured in Traefik static configuration.
- Portainer's current documentation defaults external access to HTTPS on port `9443`; this post proxies Portainer's HTTP port `9000` behind Traefik TLS, which is a valid reverse-proxy pattern but should be understood as distinct from Portainer's direct-access default.
- Pinning Portainer to an explicit `lts`, `sts`, or versioned tag would be more reproducible than `latest`.

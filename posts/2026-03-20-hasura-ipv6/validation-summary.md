# Validation Summary: How to Configure Hasura with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Hasura GraphQL Engine
- PostgreSQL
- IPv6
- Docker
- curl
- Linux firewall tools (`ufw`, `ip6tables`)

## Sources Consulted
- Hasura GraphQL Engine server configuration reference: https://github.com/hasura/graphql-engine/blob/master/docs/docs/deployment/graphql-engine-flags/reference.mdx
- Hasura Docker deployment guide: https://github.com/hasura/graphql-engine/blob/master/docs/docs/deployment/deployment-guides/docker.mdx
- Hasura GraphQL API reference (`/v1/graphql`): https://github.com/hasura/graphql-engine/blob/master/docs/docs/api-reference/graphql-api/index.mdx
- Hasura Version API reference (`/v1/version`): https://github.com/hasura/graphql-engine/blob/master/docs/docs/api-reference/version.mdx
- Hasura Health Check API reference (`/healthz`): https://github.com/hasura/graphql-engine/blob/master/docs/docs/api-reference/health.mdx
- Hasura source showing `HASURA_GRAPHQL_SERVER_HOST` is parsed as a Warp host preference: https://github.com/hasura/graphql-engine/blob/master/server/src-lib/Hasura/Server/Init/Config.hs
- Hasura source showing Warp `setHost` is used when starting the server: https://github.com/hasura/graphql-engine/blob/master/server/src-lib/Hasura/App.hs
- Warp host preference documentation (`*6`, `!6`): https://hackage.haskell.org/package/warp-3.1.9/docs/Network-Wai-Handler-Warp.html
- PostgreSQL libpq connection strings: https://www.postgresql.org/docs/current/libpq-connect.html
- PostgreSQL connection settings (`listen_addresses`): https://www.postgresql.org/docs/current/runtime-config-connection.html
- PostgreSQL client authentication / `pg_hba.conf`: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- Docker port publishing and host binding behavior: https://docs.docker.com/engine/network/port-publishing/
- Docker Compose network IPv6 support: https://docs.docker.com/reference/compose-file/networks/
- curl man page (`-6`, `--ipv6`): https://curl.se/docs/manpage.html
- Ubuntu UFW man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html

## Issues Found
- The post used generic Node.js and Uvicorn IPv6 bind examples instead of Hasura's actual `HASURA_GRAPHQL_SERVER_HOST` / `--server-host` configuration. I replaced them with Hasura-specific configuration and documented the Warp host preference values relevant to IPv6.
- The post discussed normalizing client IP addresses in application code, which is not the relevant configuration point for Hasura. I replaced that section with PostgreSQL-over-IPv6 connection details, including bracketed IPv6 literals in libpq connection URIs and the required PostgreSQL `listen_addresses` / `pg_hba.conf` settings.
- The post used `ping6`, while current `iputils` uses `ping -6`. I updated the command accordingly.
- The testing commands used the wrong endpoint (`/graphql`) and wrong example port (`4000`). I updated them to Hasura's documented endpoints: `/v1/graphql`, `/v1/version`, and `/healthz`, using Hasura's default port `8080`.
- The firewall examples opened port `4000`, which does not match Hasura's default listener. I updated them to port `8080`.
- The monitoring guidance referred generically to an IPv6 address URL. I clarified that literal IPv6 URLs need bracket syntax or an AAAA-backed hostname.
- The conclusion incorrectly repeated the title text and described generic application behavior instead of Hasura-specific configuration. I corrected it.

## Review Notes
- `HASURA_GRAPHQL_DATABASE_URL` remains officially supported in Hasura v2 for backward compatibility, although Hasura docs note that v2 can also use custom environment variables for database connections.
- The UFW example assumes IPv6 is enabled in UFW. When IPv6 is enabled, generic rules such as `ufw allow 8080/tcp` apply to both IPv4 and IPv6.
- If Hasura and PostgreSQL are communicating over a Docker bridge network and you want that path itself to use IPv6, Docker daemon / Compose IPv6 support must be enabled.

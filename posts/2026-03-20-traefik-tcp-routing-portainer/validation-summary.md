# Validation Summary: How to Configure Traefik TCP Routing for Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik TCP routers and entrypoints
- Traefik Docker provider labels
- Traefik TCP TLS passthrough
- PostgreSQL STARTTLS and SNI
- MySQL TCP protocol routing
- Portainer-managed Docker stacks
- Traefik API endpoints

## Sources Consulted
- Traefik official documentation: TCP Router - https://doc.traefik.io/traefik/reference/routing-configuration/tcp/routing/router/
- Traefik official documentation: TCP Rules & Priority / HostSNI - https://doc.traefik.io/traefik/reference/routing-configuration/tcp/routing/rules-and-priority/
- Traefik official documentation: TCP TLS and PostgreSQL STARTTLS - https://doc.traefik.io/traefik/reference/routing-configuration/tcp/tls/
- Traefik official documentation: Docker provider labels - https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik official documentation: EntryPoints - https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- Traefik official documentation: API & Dashboard - https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- PostgreSQL official documentation: libpq connection parameters (`sslmode`, `sslsni`, `sslnegotiation`) - https://www.postgresql.org/docs/current/libpq-connect.html
- PostgreSQL official documentation: frontend/backend protocol SSL flow - https://www.postgresql.org/docs/current/protocol-flow.html
- MySQL official documentation: connection phase and initial handshake - https://dev.mysql.com/doc/dev/mysql-server/8.4.5/page_protocol_connection_phase.html
- MySQL official documentation: protocol TLS flow - https://dev.mysql.com/doc/dev/mysql-server/8.4.6/page_protocol_basic_tls.html

## Issues Found
1. **MySQL TLS passthrough example incorrectly used SNI routing:** The post showed ``HostSNI(`db.example.com`)`` with TLS passthrough for MySQL. MySQL starts with a server handshake before TLS negotiation, while Traefik's documented STARTTLS-aware SNI handling is for PostgreSQL. **Fix:** Replaced that example with a PostgreSQL TLS passthrough example and added a MySQL caveat recommending a dedicated ``HostSNI(`*`)`` TCP route that passes MySQL as opaque TCP.
2. **TLS passthrough labels were incomplete for current Traefik examples:** The passthrough snippets set `tls.passthrough=true` but did not explicitly set `tls=true`. **Fix:** Added `traefik.tcp.routers.<name>.tls=true` to the TLS passthrough examples.
3. **Combined HTTP/TCP example omitted the TCP service backend port:** The TCP router labels did not include a TCP service port, which can make Docker provider routing ambiguous or wrong when a container exposes multiple ports. **Fix:** Added `traefik.tcp.services.db.loadbalancer.server.port=5432`.
4. **The post overstated that no host ports are exposed:** Traefik entrypoints still publish the ports on the Traefik host; the important distinction is that backend containers do not publish their own ports directly. **Fix:** Updated the description and conclusion to refer to backend container ports.
5. **Routing comparison table implied TCP has path routing:** TCP routers can use SNI for domain-style routing, but not HTTP paths. **Fix:** Clarified the table row as "Path and Host header" for HTTP and "SNI only (no paths)" for TCP.
6. **Traefik API verification command lacked the API prerequisite:** The `/api/tcp/routers` endpoint works only when Traefik's API is enabled. **Fix:** Updated the command comment to say "if the API is enabled."

## Review Notes
- The basic Traefik entrypoint definitions, Docker label naming, ``HostSNI(`*`)`` catch-all TCP router, and `/api/tcp/routers` endpoint are consistent with official Traefik documentation.
- PostgreSQL SNI routing requires SSL-enabled connections that send SNI. Current libpq sends SNI by default with `sslsni=1`, and the post's `sslmode=require` example is appropriate for Traefik's PostgreSQL STARTTLS guidance.
- The Docker Compose snippets assume the `proxy` network, `mysql_data` volume, and `db_root_pw` secret are already defined or available in the Portainer stack environment.

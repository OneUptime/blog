# Validation Summary: How to Configure Keycloak with IPv6

## Status
validated

## Post Type
Configuration guide / tutorial

## Technologies Covered
- Keycloak server configuration
- Keycloak reverse proxy and OIDC endpoint configuration
- PostgreSQL JDBC connectivity over IPv6
- `curl`
- IPv6 networking and proxy headers
- OneUptime monitoring

## Sources Consulted
- Keycloak production configuration: https://www.keycloak.org/server/configuration-production
- Keycloak configuration reference: https://www.keycloak.org/server/configuration
- Keycloak hostname configuration: https://www.keycloak.org/server/hostname
- Keycloak reverse proxy configuration: https://www.keycloak.org/server/reverseproxy
- Keycloak database configuration: https://www.keycloak.org/server/db
- Keycloak OpenID Connect endpoints: https://www.keycloak.org/securing-apps/oidc-layers
- PostgreSQL JDBC driver connection documentation: https://jdbc.postgresql.org/documentation/use/
- PostgreSQL libpq connection strings: https://www.postgresql.org/docs/current/libpq-connect.html
- curl man page: https://curl.se/docs/manpage.html
- curl URL syntax: https://curl.se/docs/url-syntax.html

## Issues Found
1. The original post claimed Keycloak would handle IPv6 client addresses in tokens. Keycloak documentation supports preserving client address information through trusted proxy headers, but not adding client IP addresses to tokens by default. I rewrote the description, overview, and conclusion to describe proxy and header handling instead of token claims.

2. The original "Configuration Example" sections used generic Python `ipaddress` and Redis rate-limiting code that did not configure Keycloak or PostgreSQL. I replaced those snippets with documented Keycloak CLI options for `hostname`, `proxy-headers`, `proxy-trusted-addresses`, `db`, and `db-url`, plus a PostgreSQL JDBC URL that uses the correct bracketed IPv6 literal syntax.

3. The testing section used `curl` against `/auth/login`, which is not a Keycloak endpoint. I replaced those commands with real Keycloak OpenID Connect endpoints: the discovery document at `/realms/{realm}/.well-known/openid-configuration` and the realm JWKs endpoint at `/realms/{realm}/protocol/openid-connect/certs`.

4. The original IPv6 guidance focused on IPv4-mapped normalization and `/64` rate limiting, which was generic application advice rather than documented Keycloak behavior. I replaced it with Keycloak-specific considerations: dual-stack defaults, bracketed IPv6 literals in URLs and JDBC URLs, proxy header trust settings, and stable hostname configuration.

## Review Notes
- Keycloak documentation states the server is accessible via IPv4 and IPv6 by default. The validated example keeps the optional JVM IPv6 preference flags as an explicit preference setting, not as a mandatory Keycloak requirement.
- The validated start command uses `--http-enabled=true`, which Keycloak documents for edge TLS termination at a reverse proxy. If Keycloak terminates TLS itself, the server should be started with HTTPS listener configuration instead.
- The public `hostname` in the corrected example uses a DNS name rather than an IPv6 literal because Keycloak uses that value for published OIDC metadata and issuer URLs.
- No remaining technical issues after the corrections above.

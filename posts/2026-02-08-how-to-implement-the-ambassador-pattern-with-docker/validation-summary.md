# Validation Summary: How to Implement the Ambassador Pattern with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Ambassador pattern
- HAProxy
- PostgreSQL proxying
- Redis Sentinel
- Node.js
- ioredis
- Nginx
- stunnel
- TLS

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` and `name` reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference for `network_mode`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networking guide: https://docs.docker.com/compose/how-tos/networking/
- HAProxy TCP configuration tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/tcp/
- HAProxy 2.9 configuration manual: https://docs.haproxy.org/2.9/configuration.html
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- ioredis Sentinel documentation: https://github.com/redis/ioredis#sentinel
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- stunnel manual: https://www.stunnel.org/manual.html
- npm `ci` documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/

## Issues Found
- The Docker Compose examples used the obsolete top-level `version: "3.8"` field. Removed it from the snippets because current Compose uses the Compose Specification schema and treats `version` as informational/obsolete.
- The Redis Sentinel proxy discovered the master by reading `sentinel.options` from an ioredis client configured for Sentinel mode. That does not reliably return the current master address. Replaced it with explicit `SENTINEL get-master-addr-by-name` calls and periodic refreshes.
- The Redis Dockerfile used `npm ci --production`. Replaced it with `npm ci --omit=dev`, which is the current npm form for omitting development dependencies.
- The Nginx HTTPS proxy enabled SNI but did not set the upstream TLS name when proxying through a named upstream, and upstream certificate verification was not enabled. Added `proxy_ssl_name`, `proxy_ssl_verify`, and `proxy_ssl_trusted_certificate`.
- The stunnel section described outbound TLS wrapping as "TLS termination." Renamed the example and wording to "TLS Wrapping" to avoid implying inbound TLS termination.
- The Alpine stunnel container used `/etc/ssl/certs/ca-certificates.crt` but did not install `ca-certificates`. Added the package to the install command.

## Review Notes
The examples still use placeholder hosts such as `production-db.example.com`, `api.thirdparty.com`, and `secure-db.example.com`, so the containers were not run end-to-end. The edited JavaScript snippet was syntax-checked with Node.js, and the Docker Compose and proxy configuration fields were reviewed against official documentation.

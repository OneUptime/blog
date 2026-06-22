# Validation Summary: How to Use Docker with Caddy for Automatic HTTPS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Caddy 2
- HTTPS/TLS and ACME certificate automation
- Reverse proxying
- Load balancing and health checks
- HTTP headers, CORS, authentication, compression, logging, metrics, and Caddy Admin API

## Sources Consulted
- Caddy Automatic HTTPS documentation: https://caddyserver.com/docs/automatic-https
- Caddy `reverse_proxy` directive documentation: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy `basic_auth` directive documentation: https://caddyserver.com/docs/caddyfile/directives/basic_auth
- Caddy `metrics` directive documentation: https://caddyserver.com/docs/caddyfile/directives/metrics
- Caddy Admin API documentation: https://caddyserver.com/docs/api
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/

## Issues Found
- The post stated that Caddy obtains certificates from Let's Encrypt only. Caddy's current documentation describes automatic HTTPS using public ACME CAs such as Let's Encrypt or ZeroSSL, so the text now refers to both.
- The Docker Compose examples used the obsolete top-level `version: '3.8'` field. Docker Compose now treats this field as informative only and emits an obsolete warning, so it was removed from the examples.
- The weighted load balancing example used `lb_policy weighted_round_robin` without required weight arguments. Updated it to `lb_policy weighted_round_robin 3 1`, matching Caddy's required syntax.
- The Basic Auth example used the deprecated `basicauth` directive. Updated it to `basic_auth`, the current Caddy directive name.
- The production example included `ACME_AGREE=true`, which is not required for current Caddy 2 automatic HTTPS configuration. Removed it to avoid implying a required environment variable.
- The replicas note said Caddy discovers all replicas via DNS. Updated it to the more precise statement that Docker DNS resolves the service name for replicas.
- The summary table referenced `basicauth`; updated it to `basic_auth`.

## Review Notes
Validated the changed Caddyfile snippets with the current `caddy:2-alpine` Docker image, which reported Caddy v2.11.4. Validated a representative updated Compose file with Docker Compose v5.1.3. Some examples still use placeholder images and domains, so they are structurally correct examples rather than directly runnable production files without substituting real services, DNS, and credentials.

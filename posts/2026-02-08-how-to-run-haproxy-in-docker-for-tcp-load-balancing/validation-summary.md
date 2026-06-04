# Validation Summary: How to Run HAProxy in Docker for TCP Load Balancing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- HAProxy
- TCP load balancing
- HAProxy health checks
- TLS passthrough and SNI routing
- HAProxy runtime API and stats dashboard

## Sources Consulted
- HAProxy 3.4 Configuration Manual: https://docs.haproxy.org/3.4/configuration.html
- HAProxy 2.9 Configuration Manual: https://docs.haproxy.org/2.9/configuration.html
- HAProxy Documentation index and version status: https://docs.haproxy.org/
- HAProxy official project release/status page: https://www.haproxy.org/
- Docker Official Image for HAProxy: https://hub.docker.com/_/haproxy
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The description said the post covered TLS termination, but the article configures TLS passthrough. Changed the description to "TLS passthrough" to match the actual HAProxy TCP mode example.
- The quick start implied HAProxy could be started before creating `haproxy.cfg`. Changed the wording so the Docker command is run after creating the configuration file shown in the next section.
- The examples used `haproxy:2.9-alpine`, but HAProxy 2.9 is marked EOL by the official documentation index and is no longer listed among current Docker Official Image tags. Updated the examples to `haproxy:3.4-alpine`.
- The basic MySQL example said it distributed read queries. HAProxy TCP mode balances TCP connections, not individual SQL queries. Updated the prose and comment to say it distributes client connections.
- The basic HAProxy configuration included `daemon` while the comment said HAProxy should run in the foreground for Docker. Removed `daemon` and kept the foreground behavior.
- The TLS passthrough example used legacy underscore sample fetch names (`req_ssl_hello_type`, `req_ssl_sni`). Updated them to the current dotted HAProxy fetch names (`req.ssl_hello_type`, `req.ssl_sni`).

## Review Notes
The HAProxy snippets were syntax-checked with the locally available `haproxy:2.8` Docker image, which accepted the reviewed configuration grammar including the updated SNI fetch names. Pulling `haproxy:2.9-alpine` or `haproxy:3.4-alpine` for direct image testing was blocked by Docker Hub's unauthenticated pull rate limit in this environment.

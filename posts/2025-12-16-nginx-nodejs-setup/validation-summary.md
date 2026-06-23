# Validation Summary: How to Set Up Nginx with Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx reverse proxying
- Nginx upstream load balancing and keepalive connections
- Nginx WebSocket proxying
- Nginx SSL/TLS and HTTP/2 configuration
- Express.js behind reverse proxies
- Node.js HTTP applications
- Socket.IO
- PM2 process management
- Docker Compose
- Dockerfile for Node.js
- systemd service units
- npm CLI

## Sources Consulted
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Express behind proxies guide: https://expressjs.com/en/guide/behind-proxies/
- Docker Compose file reference, version and name: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference, healthcheck: https://docs.docker.com/reference/compose-file/services/#healthcheck
- Node.js Fetch API documentation: https://nodejs.org/learn/getting-started/fetch
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- PM2 ecosystem file reference: https://pm2.io/docs/runtime/reference/ecosystem-file/
- Socket.IO server options documentation: https://socket.io/docs/v4/server-options/
- Socket.IO server initialization documentation: https://socket.io/docs/v4/server-initialization/
- systemd.exec documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Debian Lintian systemd syslog facility warning: https://lintian.debian.org/tags/systemd-service-file-uses-deprecated-syslog-facility.html

## Issues Found
- The introduction stated that Node.js applications "run on a single thread." This was too broad because Node.js uses an event loop for application JavaScript but also has worker threads and internal thread pools. I changed the wording to say Node.js applications typically run application JavaScript on a single event loop.
- The Docker Compose example used the obsolete top-level `version: '3.8'` field. I removed it because current Docker Compose uses the Compose Specification and treats `version` as informative/obsolete.
- The Docker health check used `curl`, but the shown `node:20-alpine` Dockerfile does not install curl. I changed the health check to use `node -e` with the built-in Fetch API so it works with the base image shown.
- The Dockerfile used `npm ci --only=production`. I changed it to the current `npm ci --omit=dev` syntax documented by npm for omitting development dependencies.
- The systemd service used `StandardOutput=syslog` and `StandardError=syslog`, which are obsolete on modern systemd installations and produce warnings. I changed them to `journal`.

## Review Notes
- The Nginx WebSocket examples match the official requirement to explicitly forward `Upgrade` and `Connection` headers, and the `map` usage is consistent with Nginx documentation.
- The Nginx upstream examples use valid `least_conn`, `weight`, and `keepalive` directives. For Nginx 1.29.7 and later, upstream keepalive behavior has newer defaults, but the explicit configuration remains valid.
- The Express `trust proxy` example is technically correct, but production deployments should prefer a precise trusted proxy subnet or hop count when possible rather than blindly trusting all forwarded headers.
- The `X-XSS-Protection` response header is obsolete in modern browsers. It was not changed because the snippet remains syntactically valid, but future revisions should consider removing it or replacing it with a stronger Content Security Policy discussion.

# Validation Summary: How to Configure Nginx Unit in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NGINX Unit
- Docker
- Docker Compose
- Python WSGI
- Node.js
- Unit configuration API
- Static file serving
- TLS certificates

## Sources Consulted
- NGINX Unit Docker how-to: https://docs.nginx.com/nginx-unit/howto/docker/
- NGINX Unit configuration reference: https://docs.nginx.com/nginx-unit/configuration/
- NGINX Unit installation and Docker image reference: https://docs.nginx.com/nginx-unit/installation/
- NGINX Unit language modules documentation: https://docs.nginx.com/nginx-unit/howto/modules/

## Issues Found
- The post used older `unit:1.32.1-*` Docker image tags. Updated examples to current documented image tags, `unit:1.34.1-python3.11` and `unit:1.34.1-node20`, matching the official Docker image reference.
- The Docker Compose section described the configuration as multiple language runtimes, but the snippet only used a Python image. Changed the wording to a Python runtime.
- The Python example was described as ASGI, but the callable uses WSGI's `environ` and `start_response` interface. Changed the wording to WSGI.
- The dynamic listener and TLS listener API examples used unquoted URLs containing `*`, which can be interpreted by the shell. Quoted those URLs.
- The static file `share` paths would have duplicated URI prefixes for `/static/*` requests. Changed `/www/static/$uri` to `/www$uri` and `/www/public/$uri` to `/www/public$uri`.
- The Node.js Dockerfile did not link the official `unit-http` package into the app directory. Added `npm link unit-http` after dependency installation.
- The Node.js application created an HTTP server but did not call `listen()`, which Unit's documented Node loader flow expects. Replaced the module export with `server.listen()`.
- The multi-runtime Dockerfile installed `unit-http` without the Unit development package and without matching the Unit package version. Added `unit-dev`, installed `unit-http@1.34.1` with `--unsafe-perm`, and linked `unit-http` in the Node app directory.

## Review Notes
The post is technically relevant and salvageable. The examples now align with the current official NGINX Unit documentation for Docker startup configuration, Python WSGI apps, Node.js loader configuration, static file routing, the control socket, and TLS certificate upload.

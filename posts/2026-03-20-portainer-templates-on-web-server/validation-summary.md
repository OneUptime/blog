# Validation Summary: How to Host Custom Portainer Templates on a Web Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer application templates
- Docker Compose
- Nginx
- Caddy
- Python `http.server`
- Git

## Sources Consulted
- Portainer Documentation, "Build and host your own app templates" - https://docs.portainer.io/advanced/app-templates/build
- Portainer Documentation, "App template JSON format" - https://docs.portainer.io/advanced/app-templates/format
- Portainer Documentation, "Application" - https://docs.portainer.io/user/docker/templates/application
- Portainer Documentation, "General" - https://docs.portainer.io/admin/settings/general
- Docker Docs, "Compose file reference" - https://docs.docker.com/reference/compose-file/
- Docker Docs, "Version and name top-level elements" - https://docs.docker.com/reference/compose-file/version-and-name/
- Caddy Documentation, "`header` (Caddyfile directive)" - https://caddyserver.com/docs/caddyfile/directives/header
- Python Documentation, "`http.server`" - https://docs.python.org/3/library/http.server.html
- NGINX Documentation, "`ngx_http_headers_module`" - https://nginx.org/en/docs/http/ngx_http_headers_module.html

## Issues Found
- The post treated stack template `repository.url` as an arbitrary web-server URL. Portainer's app template format requires a Git repository for stack templates, so I updated the architecture description, the JSON example, and the stack-file example to use an internal Git repository.
- The stack example used `type: 2` alongside a `docker-compose.yml` example without making it a Swarm-specific template. I changed the example to `type: 3` and updated the sample Compose file to the version `2` format documented by Portainer for Compose stack templates.
- The Nginx example implied Portainer needs CORS headers, and the config manually added a `Content-Type` response header for JSON. That was unnecessary and misleading, so I removed the CORS-specific commentary and the manual JSON header override.
- The Caddy example included `header Content-Type application/json {path}/*.json`, which is not valid Caddy `header` directive syntax. I removed the invalid header handling and kept the minimal static-file configuration.
- The verification step said to go to **App Templates**. Current Portainer documentation uses **Templates** > **Application**, so I updated that navigation.
- The Nginx and Caddy Docker Compose examples used the top-level `version` field, which Docker now marks as obsolete for Compose files. I removed it from those server-side examples.
- The automation example assumed `/opt/portainer-templates` was always a Git checkout and hard-coded `origin main`. I changed it to guard on `.git` and use a fast-forward pull without assuming a branch name.

## Review Notes
- The post is now technically correct for hosting the application template catalog on a web server. Stack templates still require a Git repository reachable by the Portainer Server; the web server hosts the `templates.json` catalog itself.
- The example images still use `:latest` tags. That is valid, but pinning image tags would make deployments more reproducible.
- Caddy automatic HTTPS behavior depends on how the hostname is resolved and what certificate authority is available. For strictly internal deployments, an internal CA may still be the better fit.

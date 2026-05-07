# Validation Summary: How to Run Nginx in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Nginx
- Container images and bind mounts
- SELinux volume labels
- Reverse proxy configuration
- Static web content hosting

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman getting started documentation: https://podman.io/docs
- NGINX Docker image documentation: https://hub.docker.com/_/nginx
- NGINX Docker deployment documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-docker/
- NGINX command-line parameters: https://nginx.org/en/docs/switches.html
- NGINX runtime control documentation: https://docs.nginx.com/nginx/admin-guide/basic-functionality/runtime-control/
- NGINX proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX compression documentation: https://docs.nginx.com/nginx/admin-guide/web-server/compression/

## Issues Found
- The post used `nginx:latest` after explicitly pulling `docker.io/library/nginx:latest`. I changed the `podman run` examples to use `docker.io/library/nginx:latest` consistently so Podman does not rely on short-name registry resolution.
- The examples mounted `~/my-website` with the private SELinux relabel option `:Z` in more than one container. I changed the shared static content mounts to `:z`, which matches Podman's documented shared-volume label behavior.
- The post claimed that Podman runs rootless by default. I changed this to say that Podman can run rootless and that rootless isolation applies when Podman is run as a non-root user.

## Review Notes
The commands and Nginx configuration snippets are otherwise consistent with the official Podman and NGINX documentation. Podman and Nginx were not installed in the local environment, so command behavior was verified against official documentation rather than local execution.

# Validation Summary: How to Set Up a Reverse Proxy with Podman and Nginx

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Nginx
- Apache httpd container image
- Podman networking
- Nginx reverse proxy configuration
- systemd user services
- Podman Quadlet
- SELinux volume labeling

## Sources Consulted
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman Quadlet/systemd documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman generate systemd` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Docker Hub official `httpd` tags: https://hub.docker.com/_/httpd/tags
- Nginx Docker image documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-docker/

## Issues Found
- The reverse proxy command published host port `80`, which can fail for rootless Podman users unless low-port binding has been configured. Changed the example to publish `8080:80`, updated related curl commands and the Quadlet `PublishPort`, and added a short note explaining when `80:80` is appropriate.
- The backend container examples set `APP_NAME` environment variables, but the stock `nginx:alpine` and `httpd:alpine` images do not use those variables. Removed the unused environment variables to avoid implying that they affect the served response.
- The Quadlet example enabled the generated service but did not start it immediately. Changed `systemctl --user enable nginx-proxy.service` to `systemctl --user enable --now nginx-proxy.service`.

## Review Notes
The remaining Podman network, Nginx upstream, `proxy_pass`, SELinux relabeling, configuration test, reload, and Quadlet syntax are consistent with the current official documentation. For production use, the post could later expand on TLS termination and rootless low-port strategies, but those are outside the scope of this validation.

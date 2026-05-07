# Validation Summary: How to Set Up Load Balancing with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman networking
- Podman Quadlet and systemd user services
- Nginx reverse proxy and load balancing
- HAProxy load balancing and health checks
- Bash shell commands

## Sources Consulted
- Podman `run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `kill` documentation: https://docs.podman.io/en/latest/markdown/podman-kill.1.html
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Nginx HTTP load balancing documentation: https://nginx.org/en/docs/http/load_balancing.html
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- HAProxy 2.8 configuration manual: https://docs.haproxy.org/2.8/configuration.html
- Docker Official Image documentation for HAProxy reload behavior: https://hub.docker.com/_/haproxy

## Issues Found
- The Nginx and HAProxy examples both published host port 80. Running both examples as written would cause a host port conflict, and port 80 is also a privileged port for typical rootless Podman setups. Changed Nginx to publish `8080:80`, HAProxy to publish `8081:80`, and updated the related `curl`, stats dashboard, monitoring, and Quadlet examples.
- The HAProxy reload command used `podman exec haproxy-lb kill -s HUP 1`. Replaced it with `podman kill --signal HUP haproxy-lb`, which uses Podman's documented signal mechanism and matches the official HAProxy container guidance to send `SIGHUP` to the container for graceful reload.
- The monitoring script ran `curl` inside the `nginx:alpine` container, but that image should not be assumed to include `curl`. Changed the backend checks to use `wget`, which is available through Alpine's base BusyBox tooling in the Nginx Alpine image.

## Review Notes
- Nginx open source passive health checks, `max_fails`, `fail_timeout`, `least_conn`, `ip_hash`, weighted round robin, and upstream keepalive examples align with Nginx documentation.
- HAProxy `balance roundrobin`, `leastconn`, `source`, `uri`, `random`, `option httpchk`, `http-check expect status 200`, `stats uri`, `inter`, `fall`, and `rise` usage align with HAProxy documentation.
- The examples are suitable for a local tutorial. Production use would normally add authentication or network restrictions to HAProxy stats and a more deliberate service dependency model for Quadlet units.

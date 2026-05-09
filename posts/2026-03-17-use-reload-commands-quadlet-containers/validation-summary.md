# Validation Summary: How to Use Reload Commands in Quadlet Containers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Quadlet
- systemd
- Nginx
- Apache HTTP Server
- HAProxy

## Sources Consulted
- Podman Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman kill documentation: https://docs.podman.io/en/latest/markdown/podman-kill.1.html
- systemd.service documentation for ExecReload: https://www.freedesktop.org/software/systemd/man/255/systemd.service.html
- NGINX runtime control documentation: https://docs.nginx.com/nginx/admin-guide/basic-functionality/runtime-control/
- Apache HTTP Server stopping and restarting documentation: https://httpd.apache.org/docs/2.2/stopping.html
- HAProxy management documentation: https://cdn.haproxy.com/documentation/haproxy-configuration-manual/new/latest/management/
- HAProxy configuration manual for master-worker reload behavior: https://docs.haproxy.org/3.2/configuration.html
- Docker Library HAProxy entrypoint source: https://raw.githubusercontent.com/docker-library/haproxy/master/docker-entrypoint.sh

## Issues Found
No technical issues found.

## Review Notes
Current Quadlet documentation includes `ReloadSignal=` and `ReloadCmd=` in the `[Container]` section as built-in helpers that generate `ExecReload` lines. The post's explicit `[Service]` `ExecReload=` examples are still technically valid because Quadlet passes normal systemd sections through to the generated service. The HAProxy `SIGUSR2` example is valid for the Docker Official HAProxy image used in the snippet because its entrypoint runs HAProxy with `-W` master-worker mode, where the master process reloads on `SIGUSR2`.

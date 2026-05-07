# Validation Summary: How to Run HAProxy in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- HAProxy 2.9
- Docker Official HAProxy image
- HTTP load balancing
- TCP load balancing
- HAProxy health checks
- HAProxy statistics dashboard

## Sources Consulted
- HAProxy 2.9 Configuration Manual: https://docs.haproxy.org/2.9/configuration.html
- Docker Official Image documentation for HAProxy: https://hub.docker.com/_/haproxy
- Docker Library HAProxy entrypoint script: https://raw.githubusercontent.com/docker-library/haproxy/master/docker-entrypoint.sh
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman kill documentation: https://docs.podman.io/en/latest/markdown/podman-kill.1.html

## Issues Found
- The pull comment described `docker.io/library/haproxy:2.9` as the latest HAProxy image. This is inaccurate because the command pins the 2.9 tag, while the current Docker Official Image `latest` tag is a newer HAProxy series. Changed the comment to "Pull the HAProxy 2.9 image."
- The first Podman run command published host port 80. That is not a reliable rootless Podman example because unprivileged users typically cannot bind host ports below 1024 unless the host `net.ipv4.ip_unprivileged_port_start` setting is changed. Changed the host mapping to `8080:80`.
- The examples that run the Docker Official HAProxy 2.9 image with HAProxy binding to container port 80 did not include `--sysctl net.ipv4.ip_unprivileged_port_start=0`. The official HAProxy image runs as the `haproxy` user for 2.4+ tags, and the image documentation recommends this sysctl for low-numbered container ports. Added the sysctl to the HTTP examples.
- The run examples used the short image name `haproxy:2.9` after pulling `docker.io/library/haproxy:2.9`. Changed the run commands to use the fully qualified image reference for consistency and to avoid short-name resolution ambiguity.

## Review Notes
The HAProxy configuration snippets use valid HAProxy 2.9 directives for HTTP mode, TCP mode, round-robin, least-connections, source hashing, HTTP health checks, TCP checks, and stats page exposure. The official image entrypoint adds foreground/master-worker flags, so the examples remain container-compatible after the command fixes.

# Validation Summary: How to Use Host Networking with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container networking
- Host network mode
- Rootless containers
- NGINX container image
- Linux sysctl settings
- tcpdump

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman rootless limitations documentation: https://github.com/containers/podman/blob/main/rootless.md
- Podman network documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Docker Official Image documentation for NGINX: https://hub.docker.com/_/nginx

## Issues Found
- The port-conflict workaround used `-e NGINX_PORT=8081` with the official NGINX image. The NGINX image only substitutes `NGINX_PORT` through template files in `/etc/nginx/templates`; setting the variable alone does not change the default listener. Updated the example to modify the default NGINX config before starting NGINX.
- The tcpdump example used `tcpdump -i eth0`, but host interface names vary and the container may not have enough network capabilities for packet capture. Updated the example to use `-i any` and add `NET_RAW` and `NET_ADMIN`.
- The security section said a host-network container can see all host network traffic. That is too broad without packet-capture capabilities. Updated it to state that the container can see host interfaces and capture host traffic with sufficient capabilities.

## Review Notes
Podman documentation confirms that `--network host` uses the host network namespace and is considered insecure because it exposes local sockets and services. Rootless low-port binding guidance is accurate: rootless Podman cannot bind ports below the kernel's `net.ipv4.ip_unprivileged_port_start` threshold unless that setting or another host-level forwarding approach is used. The verification example using `.HostConfig.NetworkMode` is supported by Podman's inspect output.

# Validation Summary: How to Set Up Portainer Behind HAProxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- HAProxy
- Docker
- Docker Compose
- TLS/SSL termination
- WebSockets

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer reverse proxy documentation: https://docs.portainer.io/advanced/reverse-proxy
- Portainer nginx reverse proxy example: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer FAQ for `--http-enabled`: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/i-enabled-force-https-only-and-now-im-locked-out-of-portainer.-how-do-i-get-back-in
- Portainer issue documenting `--trusted-origins` usage and hostname-only examples: https://github.com/portainer/portainer/issues/12748
- Portainer API docs landing page: https://docs.portainer.io/api/docs
- Portainer release notes documenting `GET /system/status`: https://docs.portainer.io/release-notes?fallback=true
- HAProxy 2.8 configuration manual: https://docs.haproxy.org/2.8/configuration.html
- Docker `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Official HAProxy image documentation: https://hub.docker.com/_/haproxy/
- Docker Official HAProxy image Dockerfile (`USER haproxy`): https://raw.githubusercontent.com/docker-library/haproxy/master/2.8/alpine/Dockerfile
- Docker Official HAProxy image entrypoint (`-W -db` behavior): https://raw.githubusercontent.com/docker-library/haproxy/master/docker-entrypoint.sh

## Issues Found
- The post used `--trusted-origins=https://portainer.example.com` in both the `docker run` and Compose examples. Portainer documents this option as a comma-separated list of trusted domains, and the official Portainer issue announcing the workaround uses hostname-only examples. I changed both examples to `portainer.example.com`.
- The description said HAProxy was being configured as a `TCP and HTTP reverse proxy`, but the sample configuration is an HTTP-mode reverse proxy with TLS termination (`mode http`, HTTP health checks, HTTP header rewriting). I corrected the description to match the actual configuration.
- The HAProxy config declared `acl is_websocket hdr(Upgrade) -i websocket` but never used that ACL in any rule. Because WebSocket upgrades are already handled by HAProxy in HTTP mode and the post already sets `timeout tunnel`, I removed the unused ACL to avoid implying it had an effect.
- The Docker Compose example for `haproxy:2.8-alpine` was missing the low-port sysctl the official image documents for binding to ports 80 and 443, because HAProxy 2.4+ official images run as the `haproxy` user by default. I added `net.ipv4.ip_unprivileged_port_start=0` under `sysctls`.

## Review Notes
- Portainer release notes document `GET /system/status` and deprecate the older `GET /status`, which supports using `/api/system/status` for HAProxy health checks on current Portainer releases.
- The combined PEM certificate step is consistent with the HAProxy configuration manual, which documents concatenating certificate and key material into a single PEM file for `crt`.
- The post uses `portainer/portainer-ce:latest`, which is valid but unpinned; future upstream releases can change behavior without the article changing.
- Container-native HAProxy logging often uses `log stdout format raw local0`, but this post keeps the host-style `/dev/log` configuration because it is still valid for non-containerized HAProxy installs.

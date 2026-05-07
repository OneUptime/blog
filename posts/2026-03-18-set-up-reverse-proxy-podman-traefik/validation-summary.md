# Validation Summary: How to Set Up a Reverse Proxy with Podman and Traefik

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Traefik Proxy v3
- Reverse proxy routing
- Container networking
- Traefik file provider
- Traefik Docker provider with the Podman socket
- Traefik middleware
- systemd and Podman Quadlet

## Sources Consulted
- Traefik Docker provider documentation: https://doc.traefik.io/traefik/v3.0/providers/docker/
- Traefik Docker routing labels documentation: https://doc.traefik.io/traefik/v3.0/routing/providers/docker/
- Traefik file provider documentation: https://doc.traefik.io/traefik/v3.0/providers/file/
- Traefik entryPoints documentation: https://doc.traefik.io/traefik/v3.3/routing/entrypoints/
- Traefik dashboard documentation: https://doc.traefik.io/traefik/v3.0/operations/dashboard/
- Traefik HTTP service/load balancer documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/service/
- Traefik rate limit middleware documentation: https://doc.traefik.io/traefik/v3.0/middlewares/http/ratelimit/
- Traefik headers middleware documentation: https://doc.traefik.io/traefik/v3.0/middlewares/http/headers/
- Traefik strip prefix middleware documentation: https://doc.traefik.io/traefik/v3.0/middlewares/http/stripprefix/
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman generate systemd deprecation documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Red Hat Podman Quadlet documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/assembly_porting-containers-to-systemd-using-podman_building-running-and-managing-containers

## Issues Found
- The provider list described a "Docker/Podman provider." Traefik documents this as the Docker provider; it can be used with Podman's Docker-compatible API socket. Updated the wording to avoid implying a separate Traefik Podman provider.
- The examples used rootless/user-level Podman patterns but published host port 80 directly. Rootless Podman commonly cannot bind privileged host ports unless the host is configured for unprivileged low ports. Changed the examples to publish `8081:80` and added a note that `80:80` is usable with rootful Podman or an adjusted host configuration.
- The socket mount used the `:Z` SELinux relabel option on `/run/user/$(id -u)/podman/podman.sock`. Podman documents `:Z` as a private relabel operation and cautions against relabeling system files/directories. Removed the relabel suffix from the socket mount.
- The dashboard URL was shown as `http://localhost:8080`. Traefik documents the insecure dashboard path as `http://<Traefik IP>:8080/dashboard/` with a trailing slash. Updated the dashboard URL.
- The Quadlet example enabled the generated service without starting it. Changed `systemctl --user enable traefik.service` to `systemctl --user enable --now traefik.service`.
- The prerequisites said Podman 4.0 or later while the post's systemd section uses Quadlet. Updated the prerequisite to distinguish the manual setup from the Quadlet section.

## Review Notes
- The file-provider and label-provider examples are structurally consistent with Traefik's documented HTTP routers, services, load balancers, and middleware configuration.
- The `websecure` entrypoint is defined in the first static configuration but not published or used by any router in the tutorial. This is not incorrect, but a future HTTPS-focused revision should add TLS configuration and publish port 443.
- The Traefik dashboard is intentionally configured with `api.insecure: true`; Traefik documents this mode for testing and does not recommend it for production.

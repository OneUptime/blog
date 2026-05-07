# Validation Summary: How to Use Podman for Home Lab Setup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Pi-hole
- Traefik
- Homepage
- Uptime Kuma
- Prometheus
- Node Exporter
- Grafana
- WireGuard
- Vaultwarden

## Sources Consulted
- Podman network creation docs: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman Quadlet/systemd docs: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman systemd user-service/linger docs: https://docs.podman.io/en/v4.4/markdown/podman-generate-systemd.1.html
- Red Hat rootless Podman considerations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/epub/building_running_and_managing_containers/con_understanding-the-ubi-standard-images_assembly_types-of-container-images
- Pi-hole official Docker image README: https://github.com/pi-hole/docker-pi-hole
- Traefik API and dashboard docs: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Homepage Docker installation docs: https://gethomepage.dev/installation/docker/
- Uptime Kuma official README: https://github.com/louislam/uptime-kuma
- Uptime Kuma Docker tags wiki: https://github.com/louislam/uptime-kuma/wiki/Docker-Tags
- Prometheus Node Exporter README: https://github.com/prometheus/node_exporter/blob/master/README.md?plain=1
- LinuxServer WireGuard README: https://github.com/linuxserver/docker-wireguard/blob/master/README.md

## Issues Found
- The post implied all services could run rootless without extra host privileges. Rootless Podman cannot publish host ports below `1024` unless the host lowers `net.ipv4.ip_unprivileged_port_start`, so I added that prerequisite and softened the blanket rootless claim.
- The Pi-hole example mounted `/etc/dnsmasq.d` without the Pi-hole v6 caveat and environment setting required for that path. I removed the extra volume so the example matches the current fresh-install guidance.
- The Traefik section said it automatically discovers containers, but the shown configuration only enables the file provider. I changed the wording to match the actual config, added the missing directory creation command, and corrected the dashboard URL to `/dashboard/`.
- The Homepage container command omitted the required `HOMEPAGE_ALLOWED_HOSTS` environment variable. I added it and also created the missing config directory before writing `services.yaml`.
- The Uptime Kuma example used `latest`, which the official project documents as deprecated and pinned to the old v1 line. I changed the image tag to `:2`.
- The Prometheus configuration scraped `cadvisor:8080` even though no cAdvisor container was defined anywhere in the post. I removed that broken scrape target. I also aligned the Node Exporter image reference and bind-mount flags with the current upstream container guidance.
- The WireGuard explanation overstated the module-loading requirement and the command was missing the official `net.ipv4.conf.all.src_valid_mark=1` sysctl plus the standard LinuxServer image reference. I updated the explanation, kept the service rootful, and corrected the command.
- The Quadlet section told readers to enable `uptime-kuma`, `grafana`, and `homepage` units even though only `pihole.container` and `homelab.network` were actually shown, and it omitted the `loginctl enable-linger` step needed for rootless user services to keep running after logout and reboot. I changed the text to explain the pattern, added the linger step, and only start the unit that is actually defined in the example after `daemon-reload`.

## Review Notes
- Several images still use rolling tags such as `latest`. Those tags are valid for the projects involved, but pinning specific versions would make the guide more reproducible.
- The rootless low-port workaround is shown with `sysctl -w`, which is temporary; the post now explicitly notes that it should be persisted if the services need to survive reboots.
- Rootless Quadlet services rely on the user systemd instance. The post now includes `loginctl enable-linger`, which is important if the services are expected to start after boot without an active login session.
- The Traefik image is pinned to `v3.0`. The validated configuration remains compatible with current Traefik v3 documentation, but the tag itself is older and may be worth refreshing in a future update.

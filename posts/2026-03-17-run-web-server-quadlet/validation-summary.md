# Validation Summary: How to Run a Web Server with Quadlet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Nginx
- Podman health checks
- Podman auto-update

## Sources Consulted
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman auto-update documentation: https://docs.podman.io/en/stable/markdown/podman-auto-update.1.html
- Podman healthcheck documentation: https://docs.podman.io/en/stable/markdown/podman-healthcheck.1.html
- systemd loginctl documentation: https://www.freedesktop.org/software/systemd/man/loginctl.html
- Official NGINX Docker image documentation: https://hub.docker.com/_/nginx
- NGINX Docker deployment documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-docker/

## Issues Found
- The post instructed readers to run `systemctl --user enable webserver.service`. Quadlet-generated services are transient, and Podman documents that they cannot be enabled directly with `systemctl enable`; the generator applies the Quadlet `[Install]` section instead. I removed that command and left the existing `[Install]` section as the enablement mechanism.
- The post claimed boot startup for a rootless user service without mentioning user lingering. A user manager must be spawned at boot for rootless user services to start without an active login. I added `sudo loginctl enable-linger "$USER"` and updated the summary wording.
- The post described health checks with automatic restarts, but a health check alone does not restart the container when it becomes unhealthy. Podman documents `HealthOnFailure=kill` as the action that integrates best with systemd because systemd can then restart the service. I added `HealthOnFailure=kill`.
- The post described auto-update as automatic after setting `AutoUpdate=registry`, but Podman auto-update is driven by `podman auto-update` and the `podman-auto-update.timer`. I changed the Quadlet comment to say the container is marked for auto-update, added `systemctl --user enable --now podman-auto-update.timer`, and updated the summary wording.
- The rootless Quadlet example included `After=network-online.target`, but Podman documents that user units cannot wait for the system `network-online.target`; Quadlet adds an implicit user dependency on `podman-user-wait-network-online.service`. I removed the ineffective explicit dependency.
- The opening claim called the example "production-ready" while it uses `nginx:latest` and does not include production hardening. I changed that phrase to "an Nginx web server" to avoid overstating the deployment.

## Review Notes
The tutorial is technically relevant and the core Quadlet, port publishing, volume mount, Nginx content path, health check keys, journald usage, and `podman healthcheck run` command are valid. For production use, future revisions could pin an Nginx image tag or digest and add TLS, firewall, and security-hardening guidance.

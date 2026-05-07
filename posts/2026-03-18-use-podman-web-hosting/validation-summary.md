# Validation Summary: How to Use Podman for Web Hosting

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman Quadlet
- systemd user services
- Nginx
- Let's Encrypt
- Certbot
- SELinux
- Node.js

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman create` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Red Hat container documentation on rootless Podman limitations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot installation guide: https://eff-certbot.readthedocs.io/en/stable/install.html
- NGINX headers module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- NGINX gzip module documentation: https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- NGINX HTTP load balancing documentation: https://nginx.org/en/docs/http/load_balancing.html
- systemd `loginctl` documentation: https://www.freedesktop.org/software/systemd/man/loginctl.html
- systemd unit specifiers documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html

## Issues Found
- The introduction and Podman overview implied that the hosting flow generally works without root privileges. I corrected that wording because binding host ports below `1024` is not available to rootless Podman by default.
- The reverse proxy example published host port `80` with rootless-style commands. I changed that section to use rootful `sudo podman` commands so the example works as written.
- The TLS example mounted only `/etc/letsencrypt/live/example.com`, but Certbot stores the active files in `live/` as symlinks into `/etc/letsencrypt/archive`. I changed the example to mount the full `/etc/letsencrypt` tree and updated the NGINX certificate paths accordingly.
- The TLS example used `:Z` on certificate files under `/etc/letsencrypt`. Podman documents that system files and directories should not be relabeled this way on SELinux systems, so I replaced that with `--security-opt label=disable` for the TLS container.
- The Certbot `--standalone` example did not mention that port `80` must be free during validation. I added that requirement so the certificate issuance step is accurate.
- The Quadlet example used `Volume=./html`, which resolves relative to the Quadlet file location rather than the earlier `~/mysite/html` directory used in the post. I corrected it to `Volume=%h/mysite/html:/usr/share/nginx/html:ro,Z`.
- The Quadlet management commands used `systemctl --user enable web-server` as if that alone made the service start at boot. I replaced that with `loginctl enable-linger $USER`, which is the required step for user services to persist across logout and start at boot.
- The explanation of the `:Z` volume suffix was too broad. I clarified that `:Z` is for a single container and `:z` should be used when multiple containers share the same host content.
- I updated the NGINX container image references to fully qualified names so the examples do not rely on short-name resolution behavior.

## Review Notes
None.

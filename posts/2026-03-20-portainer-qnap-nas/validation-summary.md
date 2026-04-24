# Validation Summary: How to Install Portainer on QNAP NAS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- QNAP QTS / QuTS hero
- QNAP Container Station 3
- Portainer Community Edition
- Docker Engine
- Docker Compose / Compose V2
- QuFirewall

## Sources Consulted
- Portainer CE install docs for Docker on Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer requirements and supported versions: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer Docker socket guidance: https://docs.portainer.io/admin/environments/add/docker/socket
- QNAP SSH access documentation: https://www.qnap.com/en/how-to/faq/article/how-do-i-access-my-qnap-nas-using-ssh
- QNAP Container Station 3 tutorial: https://www.qnap.com/en-us/how-to/tutorial/article/how-to-use-container-station-3
- QNAP Compose V2 / Container Station 3 FAQ: https://www.qnap.com/en-us/how-to/faq/article/why-cant-i-use-docker-compose-commands-in-container-station
- QNAP QuFirewall rule-order guidance: https://www.qnap.com/en-us/how-to/faq/article/if-i-install-and-enable-the-qufirewall-on-nas-and-it-causes-the-ftp-service-to-become-not-accessible-what-can-i-do-to-fix-this
- Docker Compose top-level `version` element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker volume CLI reference: https://docs.docker.com/reference/cli/docker/volume/create/

## Issues Found
- The post used QNAP's older SSH settings path. I updated it to `Control Panel > Network & File Services > Telnet/SSH` to match current QNAP documentation.
- The post treated Portainer port `9000` as the primary access port and used the `latest` image tag. I updated the instructions to use Portainer's current recommended `portainer/portainer-ce:lts` image and `https://<qnap-ip>:9443` as the primary access URL, with port `9000` kept as optional legacy HTTP access.
- The Container Station networking instructions mixed host networking with manual port publishing. I corrected the instructions to use bridge-mode port publishing for the documented `9443` and optional `9000` mappings.
- The Compose example included the top-level `version` field even though Container Station 3 uses Compose V2, where `version` is obsolete. I removed it and updated the image/tag and port guidance in the YAML.
- The firewall section referenced an outdated QTS security path. I updated it to use QuFirewall and documented allow-rule ordering in line with QNAP's QuFirewall guidance.
- The troubleshooting section recommended `chmod 666 /var/run/docker.sock`, which is an unsafe workaround and not aligned with official guidance. I replaced it with a safer note to use an administrator shell (`sudo -i`) and keep the socket from being made world-writable.
- The "Port Already in Use" example had invalid shell syntax because it placed an inline comment after a line-continuation backslash. I corrected the command and updated it to the `lts` image and current port usage.
- The update commands used `latest`, `admin@<qnap-ip>`, and legacy `9000` mapping as the default path. I updated them to the current `lts` image, a generic administrator username, and `9443` as the default published port.

## Review Notes
- Portainer's official Docker install guide also exposes port `8000` for Edge Agent tunnel traffic. Omitting `8000` is acceptable for this basic local QNAP install because Portainer documents it as optional unless Edge features are needed.

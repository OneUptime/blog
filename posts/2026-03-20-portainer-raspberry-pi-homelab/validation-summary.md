# Validation Summary: How to Set Up a Home Lab with Portainer on Raspberry Pi - Homelab

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Raspberry Pi OS
- Raspberry Pi 4 / Raspberry Pi 5
- Docker Engine
- Docker Compose / Compose Specification
- Portainer CE
- Pi-hole
- Home Assistant Container
- offen/docker-volume-backup

## Sources Consulted
- Raspberry Pi OS documentation: https://www.raspberrypi.com/documentation/
- Raspberry Pi networking documentation noting NetworkManager as the default on Bookworm and newer: https://www.raspberrypi.com/documentation/configuration/linux_kernel.html
- Docker Engine install guide for Raspberry Pi OS: https://docs.docker.com/engine/install/raspberry-pi-os/
- Docker Linux post-install steps: https://docs.docker.com/engine/install/linux-postinstall/
- Docker Compose Specification reference and obsolete `version` field note: https://docs.docker.com/reference/compose-file/ and https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose volumes reference for `external` and `name`: https://docs.docker.com/reference/compose-file/volumes/
- Portainer CE install docs for Docker on Linux (LTS): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Pi-hole Docker docs: https://docs.pi-hole.net/docker/
- Pi-hole Docker configuration docs: https://docs.pi-hole.net/docker/configuration/
- Pi-hole v5 to v6 Docker upgrade notes: https://docs.pi-hole.net/docker/upgrading/v5-v6/
- Home Assistant Linux / Container installation docs: https://www.home-assistant.io/installation/linux
- Home Assistant installation overview: https://www.home-assistant.io/installation/
- docker-volume-backup documentation: https://offen.github.io/docker-volume-backup/

## Issues Found
- The Docker install command used `curl ... | sh` without `sudo`, which would fail for a normal Raspberry Pi OS user. It was changed to download the script and run it with `sudo sh`, matching Docker’s documented convenience-script flow.
- The static IP instructions used `/etc/dhcpcd.conf`, but current Raspberry Pi OS releases use NetworkManager by default. The post was updated to use `nmcli`, which matches current Raspberry Pi documentation.
- The Portainer install used a floating `latest` tag. It was updated to `portainer/portainer-ce:lts` to match current official Portainer CE LTS install guidance.
- The Compose example used the obsolete top-level `version` key. It was removed because current Compose uses the latest schema automatically and warns that `version` is obsolete.
- The Pi-hole example used the old `WEBPASSWORD` environment variable. Current Pi-hole Docker docs use `FTLCONF_webserver_api_password`, so the post was updated accordingly.
- The Pi-hole example omitted `FTLCONF_dns_listeningMode: 'ALL'`, which Pi-hole documents as necessary when using Docker’s default bridge networking for LAN DNS requests. This was added.
- The Pi-hole example persisted `/etc/dnsmasq.d` even though Pi-hole v6 no longer reads that directory by default for a fresh install. The unused mount was removed.
- The Home Assistant container example was missing `privileged: true` and the `/run/dbus` mount shown in current official installation docs. These were added, and the inline comment was adjusted to avoid overstating the requirement.
- The backup snippet was not a fully valid standalone Compose example and did not clearly define how shared volumes would be referenced. It was updated into a separate stack example using external volumes, and the main stack volumes were given stable names so the backup stack can reference them correctly.

## Review Notes
- Docker’s convenience script is still supported, but Docker’s repository-based install remains the more controlled option for long-lived systems.
- Home Assistant Container is valid here, but Home Assistant OS is still the recommended installation type for most Raspberry Pi users and provides apps/add-ons and built-in backup workflows.
- Portainer port `8000` is optional and is mainly needed for Edge agent features; keeping it exposed is not incorrect, but it is not required for a basic local-only setup.
- The post still uses several `latest` tags for non-Portainer services. They are valid, but explicit version pinning would improve long-term reproducibility.

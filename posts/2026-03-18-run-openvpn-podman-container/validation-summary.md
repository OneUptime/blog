# Validation Summary: How to Run OpenVPN in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenVPN
- Podman
- Podman named volumes
- Podman Quadlet
- systemd
- EasyRSA / PKI
- Linux container networking

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html
- Podman Quadlet / `podman-systemd.unit` documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman generate systemd` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- systemd service documentation: https://www.freedesktop.org/software/systemd/man/255/systemd.service.html
- kylemanna/docker-openvpn README: https://github.com/kylemanna/docker-openvpn

## Issues Found
- The `--restart unless-stopped` explanation said it automatically restarts the container after reboot. Podman documents `--restart` as a container exit policy, with boot restart handled by `podman-restart.service` or systemd management, so the explanation was corrected to point readers to the systemd/Quadlet setup for reliable boot startup.
- The Quadlet example used `Restart=unless-stopped` under `[Service]`. That is a Docker/Podman restart policy value, not a valid systemd `Restart=` value. It was changed to `Restart=always`, which is valid according to systemd documentation.
- The Quadlet section created a container named `openvpn` after the manual run step had already created the same container name. A `podman rm -f openvpn` command was added before enabling the Quadlet so the service can create its managed container while preserving the named volume.
- The TCP switching section regenerated server configuration but did not update exported client profiles. A client profile re-export command was added so the `.ovpn` file reflects the updated TCP connection settings.

## Review Notes
- Podman was not installed in the review environment, so CLI validation was performed against official Podman documentation rather than local `podman --help` output.
- The post uses `docker.io/kylemanna/openvpn:latest`, which is consistent with the upstream examples, but pinning a digest or versioned image would improve reproducibility in the future.

# Validation Summary: How to Use Podman on Debian Server

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman
- Debian
- Buildah
- Skopeo
- Quadlet
- systemd
- podman-compose
- Linux firewall tooling (`ufw`, `iptables`)
- Container registries and container storage

## Sources Consulted
- Podman documentation: `podman(1)` https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman documentation: `podman-run(1)` https://docs.podman.io/en/v4.3/markdown/podman-run.1.html
- Podman documentation: `podman-container.unit(5)` https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman documentation: `podman-network.unit(5)` https://docs.podman.io/en/latest/markdown/podman-network.unit.5.html
- Podman documentation: `podman-auto-update(1)` https://docs.podman.io/en/v5.8.0/markdown/podman-auto-update.1.html
- Debian package metadata: `podman` in Bookworm https://packages.debian.org/bookworm/podman
- Debian package metadata: `podman` in Bullseye https://packages.debian.org/bullseye/podman
- Debian package metadata: `podman` in Bullseye Backports https://packages.debian.org/bullseye-backports/podman
- Debian package metadata: `podman-compose` in Bookworm https://packages.debian.org/bookworm/podman-compose
- Debian manpages: `buildah-run(1)` https://manpages.debian.org/bookworm/buildah/buildah-run.1.en.html
- Debian manpages: `buildah-config(1)` https://manpages.debian.org/bookworm/buildah/buildah-config.1.en.html

## Issues Found
- The Bullseye section said readers may need `bullseye-backports` for a newer Podman version and provided an exact `apt` command, but the `podman` package is not currently available in `bullseye-backports`. I replaced that section with the accurate Bullseye main-repository install command.
- The Quadlet example defined an `app-network.network` unit but never attached the container service to it. I added `Network=app-network.network` to the container unit and removed the explicit `NetworkName=` override so the example matches Quadlet's documented `.network` dependency behavior.
- The system-wide storage example set `mount_program = "/usr/bin/fuse-overlayfs"` in `/etc/containers/storage.conf`. That setting is rootless-oriented guidance in Podman documentation, so I removed it from the system-wide example and added it to the rootless `~/.config/containers/storage.conf` example instead.
- The auto-update section used a system-level timer and system-level Quadlet units but ran the dry-run update command without `sudo`. I updated the timer listing and dry-run commands to use `sudo` consistently for the system-managed setup shown in the post.

## Review Notes
- Debian 12 (Bookworm) currently ships Podman 4.3.1, while newer Debian releases ship newer Podman major versions, so feature availability can differ by distribution release.
- The firewall examples are syntactically valid, but on real remote servers the UFW flow should usually preserve SSH access before enabling the firewall.
- Persisting raw `iptables` rules across reboots typically requires an additional restore mechanism such as `iptables-persistent`; the post's command only writes the rules file.

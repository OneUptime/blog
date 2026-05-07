# Validation Summary: How to Use Podman on Edge Devices

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman
- Podman Quadlet
- systemd user services and timers
- Fedora IoT and rpm-ostree
- NVIDIA Jetson
- NVIDIA Container Toolkit and CDI
- SSH-based remote Podman management
- Linux container resource controls

## Sources Consulted
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman Quadlet and systemd units: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman API service and `podman.socket`: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman remote connections: https://docs.podman.io/en/v5.7.0/markdown/podman-system-connection-add.1.html
- Podman auto-update: https://docs.podman.io/en/v4.9.0/markdown/podman-auto-update.1.html
- Podman container prune: https://docs.podman.io/en/v5.0.2/markdown/podman-container-prune.1.html
- Podman image prune: https://docs.podman.io/en/v3.0/markdown/podman-image-prune.1.html
- Podman disk-usage formatting: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman restart policy: https://docs.podman.io/en/v4.6.1/markdown/options/restart.html
- systemd user unit search paths: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.17.3/install-guide.html
- NVIDIA CDI support for Podman: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.18.0/cdi-support.html

## Issues Found
- The rootless `storage.conf` example set `graphroot` to `/var/lib/containers/storage`, which is the root-owned default path and is not appropriate for a user-scoped rootless configuration. I removed the incorrect root-owned path settings and kept a valid rootless overlay configuration.
- The cleanup script was written to `/usr/local/bin` and logged to `/var/log`, but the post ran it from a user systemd unit. That combination would fail without extra privilege changes. I moved the script and log output under the user’s home directory and updated the systemd unit accordingly.
- The cleanup script claimed to remove unused images but used `podman image prune -f`, which only prunes dangling images by default. I changed it to `podman image prune -a -f` so the command matches the explanation.
- The cleanup and watchdog examples created new user unit files without reloading the user systemd manager. I added `systemctl --user daemon-reload` before enabling the timers.
- The remote API example used an SSH tunnel plus `tcp://localhost:2375`, which is not the canonical Podman remote workflow documented upstream. I replaced it with `podman system connection add ...` and `podman --connection ...`.
- The Jetson GPU section used the older runtime-hook/device-node pattern and installed `nvidia-container-runtime`. Current NVIDIA documentation recommends `nvidia-container-toolkit` with CDI for Podman. I updated the section to generate a CDI spec and run the container with `--device nvidia.com/gpu=all`.

## Review Notes
- The auto-update timer scope depends on how containers are managed. `systemctl --user` is appropriate for rootless Quadlet units; `sudo systemctl` applies to root-managed workloads.
- The remote Podman socket path includes the remote user’s numeric UID. The example now calls that out because it may not be `1000` on every device.

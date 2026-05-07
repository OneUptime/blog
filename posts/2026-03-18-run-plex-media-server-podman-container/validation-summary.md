# Validation Summary: How to Run Plex Media Server in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Plex Media Server
- Podman
- LinuxServer.io Plex container image
- Linux containers and bind mounts
- SELinux volume labels
- Intel Quick Sync hardware transcoding
- NVIDIA Container Toolkit CDI devices
- Quadlet and systemd

## Sources Consulted
- LinuxServer.io Plex image documentation: https://docs.linuxserver.io/images/docker-plex/
- LinuxServer.io PUID/PGID documentation: https://docs.linuxserver.io/general/understanding-puid-and-pgid/
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- NVIDIA Container Toolkit CDI documentation: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.18.1/cdi-support.html
- Plex hardware-accelerated streaming documentation: https://support.plex.tv/articles/115002178853-using-hardware-accelerated-streaming/
- Plex secure connections documentation: https://support.plex.tv/articles/206225077-how-to-use-secure-server-connections/
- Plex network settings documentation: https://support.plex.tv/articles/200430283-network/
- systemd service documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The hardware transcoding examples attempted to run another container named `plex` after Step 3 had already created one. Added `podman stop plex` and `podman rm plex` before the Intel and NVIDIA recreation commands so the examples work when followed sequentially.
- The NVIDIA Podman CDI example omitted `--security-opt=label=disable`, which NVIDIA includes in its Podman CDI example and is commonly needed on SELinux-enabled hosts. Added the flag and added a note to verify CDI devices with `nvidia-ctk cdi list`.
- The NVIDIA section did not mention that Podman CDI devices require Podman 4.1 or later. Added that version-specific requirement in the NVIDIA subsection while keeping the general prerequisite unchanged.
- The Quadlet example used `Volume=~/plex/...`, but Quadlet volume sources are passed as Podman volume values and should use absolute paths for a system-wide unit. Replaced these with `/home/your-user/plex/...` and added a note to substitute the actual home directory.
- The Quadlet example used `Restart=unless-stopped`, which is valid for Podman/Docker restart policies but not a valid systemd `Restart=` value. Replaced it with `Restart=always`.
- The Quadlet commands used `sudo systemctl enable --now plex.service`, but Podman documents generated Quadlet services as transient units where the `[Install]` section is applied by the generator rather than by `systemctl enable`. Replaced it with `sudo systemctl start plex.service` after `daemon-reload`.

## Review Notes
The main Podman run command, LinuxServer.io environment variables, Plex claim token expiration, Plex web URL, Intel `/dev/dri` device mapping, Plex Pass requirement for hardware acceleration, and the container update workflow match the consulted documentation. The post uses `docker.io/linuxserver/plex:latest`; LinuxServer.io examples currently prefer `lscr.io/linuxserver/plex:latest`, but Docker Hub remains a documented distribution path, so this was not treated as a correctness issue.

# Validation Summary: How to Run Sonarr in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Sonarr
- Podman
- LinuxServer.io Sonarr container image
- Podman networks
- systemd
- Quadlet
- SELinux volume relabeling

## Sources Consulted
- LinuxServer.io Sonarr image documentation: https://docs.linuxserver.io/images/docker-sonarr/
- Podman `podman generate systemd` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman Quadlet basic usage documentation: https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html
- Podman systemd/Quadlet unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman rootless systemd service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman run volume/SELinux relabeling documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Sonarr official site: https://sonarr.tv/

## Issues Found
- The post described the LinuxServer.io image as having "automatic update support." LinuxServer.io documents this image as static/versioned and requiring image pull plus container recreation for updates, so the wording was changed to say the image stores configuration outside the container.
- The examples used `docker.io/linuxserver/sonarr:latest`. LinuxServer.io's current documentation uses `lscr.io/linuxserver/sonarr:latest`, so the image reference and update command were changed to the official registry.
- Shared media and download directories used the private SELinux relabel option `:Z`. Podman documents `:Z` as private to one container and `:z` as shared across containers, so the media and downloads mounts were changed to `:z`.
- The flag table still showed `:Z` for shared media and downloads. It was updated to match the corrected commands.
- The prerequisite listed Podman 4.0 or later while the recommended systemd example uses Quadlet. The prerequisite now notes that Podman 4.4 or later is needed for the Quadlet example.
- The Quadlet example mixed rootless and rootful paths while using `%h` and rootless `systemctl --user` commands. The wording now identifies the snippet as rootless and tells root users to replace `%h` with absolute host paths.
- The rootless systemd example enabled the user service but did not enable lingering, so it would not reliably start at boot without a user login session. The example now includes `loginctl enable-linger`.

## Review Notes
- Podman was not installed in the local environment, so CLI verification against local `--help` output could not be performed. Commands and configuration were verified against official Podman documentation instead.
- The `/tv` and `/downloads` layout is valid and documented by LinuxServer.io as an easy starting point, but LinuxServer.io also notes it can prevent hardlinks and atomic moves. A future improvement could show a single shared `/data` style layout for better import behavior.

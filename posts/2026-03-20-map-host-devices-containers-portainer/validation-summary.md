# Validation Summary: How to Map Host Devices (USB, Serial) to Containers in Portainer - Map

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose Specification
- Linux device files (`/dev/ttyUSB*`, `/dev/ttyACM*`, `/dev/video*`)
- udev rules

## Sources Consulted
- Docker Docs: `docker container run` (`--device`) - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Compose services reference (`devices`, `group_add`) - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose `version` top-level element (obsolete) - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: `docker stack deploy` and Swarm stack behavior - https://docs.docker.com/reference/cli/docker/stack/deploy/ and https://docs.docker.com/engine/swarm/stack-deploy/
- Portainer Docs: Add a new container - https://docs.portainer.io/user/docker/containers/add
- Portainer Docs: Advanced container settings - https://docs.portainer.io/2.21/user/docker/containers/advanced
- Portainer Docs: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- `udev(7)` manual - https://man7.org/linux/man-pages/man7/udev.7.html
- Local CLI help output: `dmesg --help`, `chmod --help`, `stat --help`, `lsusb --help`, `udevadm --help`

## Issues Found
- The post implied that Portainer stack YAML device mapping applied generally across Portainer environments. I narrowed the wording to Docker Standalone / Compose-based environments, because Portainer uses Compose-style stack files there, while Swarm deployments use `docker stack deploy` semantics.
- The Portainer UI walkthrough listed a dedicated permissions field. I removed that field from the instructions to align with Portainer’s documented device-mapping UI, while still relying on Docker’s default device permissions behavior (`rwm`).
- The Compose example used `version: "3.8"`. I removed it because Docker’s current Compose documentation marks the top-level `version` field as obsolete.
- The permission example suggested `group_add: dialout`, which can be wrong when the container’s group name or GID does not match the host device node. I changed this to use the device’s numeric GID via `stat -c '%g' /dev/ttyUSB0`, which matches how Linux device permissions are enforced.
- The host-device discovery comments were slightly inaccurate: `ls /dev/tty* | grep -E "USB|ACM"` does not list all USB devices, and `/dev/video*` is not USB-only. I corrected the wording without changing the commands.
- The `chmod a+rw` example needed a persistence caveat. I noted that this is temporary until the device node is recreated.
- The udev rule block was tagged as `bash` even though it is a rule file entry, not a shell command. I changed it to a plain text block.

## Review Notes
- `dmesg | tail -20` is valid, but on some Linux hosts access to kernel logs may require elevated privileges or specific kernel settings.
- The post’s device-mapping examples remain accurate for classic `/dev/...` mappings. Docker also supports CDI-based device selection, but that is outside the scope of this post.
- I could not run live `docker` or `docker compose` commands in this workspace because Docker is not installed here; validation was done against official docs and local CLI help for the Linux utilities used.

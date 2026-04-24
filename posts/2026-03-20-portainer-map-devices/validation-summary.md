# Validation Summary: How to Map Devices to Containers in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Linux device nodes under `/dev`
- `udevadm`
- `stat`

## Sources Consulted
- Docker `docker container run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Portainer Add a new container documentation: https://docs.portainer.io/sts/user/docker/containers/add
- Portainer Advanced container settings documentation: https://docs.portainer.io/user/docker/containers/advanced
- Linux kernel USB userspace API documentation: https://docs.kernel.org/6.6/driver-api/usb/usb.html
- Local command help: `udevadm info --help`
- Local command help: `stat --help`

## Issues Found
1. The description and introduction implied GPUs are configured through Portainer's generic device-mapping UI. Updated the wording to keep the post focused on device mappings and to note that Portainer exposes NVIDIA GPU support separately under `Runtime & Resources`, matching current Portainer and Docker documentation.
2. The Portainer UI steps described a permissions field that is not documented in the current Portainer container-creation flow. Updated the navigation to `Advanced container settings` -> `Runtime & Resources` -> `Devices` and kept the example focused on host and container device paths.
3. Several YAML examples combined alternative mappings into a single snippet, including duplicate `devices:` keys or comments that implied "or" while still producing one combined list. Split those into separate valid snippets for USB, webcam/V4L2, and sound-device examples.
4. The serial-port example said `dialout` was "UID 20 on most systems". Corrected that note because device access is based on group membership, and the later example already correctly uses the host GID.
5. The hot-plug section suggested mounting all of `/dev` alongside `device_cgroup_rules`, which does not match Docker's documented `--device-cgroup-rule` behavior. Reworked the section so it now shows how to inspect a device's major number, keeps startup devices under `devices`, and explains that `device_cgroup_rules` only widens the cgroup allowlist rather than automatically creating or passing new device nodes into a running container.

## Review Notes
- Portainer's current documentation separates generic device mappings from GPU configuration. On Docker Standalone environments, Portainer documents GPU support as NVIDIA-specific.
- Device paths, host group IDs, and device major numbers are host-specific. The revised post now instructs readers to inspect those values on the target host instead of assuming fixed IDs.

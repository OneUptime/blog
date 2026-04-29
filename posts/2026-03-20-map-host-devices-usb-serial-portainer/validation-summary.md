# Validation Summary: How to Map Host Devices (USB, Serial) to Containers in Portainer (3)

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer stacks
- Docker Engine
- Docker Compose / Compose Specification
- Linux device mappings under `/dev`
- `udevadm` and udev rules
- USB and serial hardware access from containers

## Sources Consulted
- Portainer Docs, "Add a new stack": https://docs.portainer.io/sts/user/docker/stacks/add
- Docker Docs, "Services" Compose reference (`devices`, `group_add`, `privileged`, `device_cgroup_rules`): https://docs.docker.com/reference/compose-file/services/
- Docker Docs, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, "docker container run" (`--device`, `--device-cgroup-rule`): https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs, "Running containers" (`--group-add`, `--privileged`): https://docs.docker.com/engine/containers/run/
- Docker Desktop FAQ, "Can I pass through a USB device to a container?": https://docs.docker.com/desktop/troubleshoot-and-support/faqs/general/
- systemd `udevadm` manual: https://www.freedesktop.org/software/systemd/man/latest/udevadm.html
- systemd `udev` manual: https://www.freedesktop.org/software/systemd/man/udev.html
- Local CLI help used to confirm current command flags: `udevadm info --help`, `udevadm monitor --help`, `lsusb --help`

## Issues Found
- The main Compose example used a top-level `version: "3.8"` field. Docker now marks the top-level `version` element as obsolete, so I removed it.
- The post used `udevadm monitor --environment --udev`, but current `udevadm` documentation and local help expose `--property` for printing event properties. I updated the command to `udevadm monitor --property --udev`.
- The opening explanation implied the workflow was generally applicable anywhere Portainer runs. Docker Desktop does not support direct USB device passthrough, so I scoped the guidance to Linux Docker Engine hosts.
- The udev section implied that stable symlinks alone solve reconnect behavior. Docker documents dynamically recreated devices separately, so I added a note that reconnecting a device may still require restarting the container.
- The example udev rule used `MODE="0666"`, which granted world-writable access and conflicted with the later group-based permissions guidance. I changed it to `GROUP="dialout", MODE="0660"` to align the example with the rest of the post.
- The permissions guidance treated `dialout` as universally correct. I clarified that the container must join the host group that owns the device, which is often `dialout` for serial ports but not guaranteed on every distribution.
- The verification example said `cat /dev/ttyUSB0` will show data. I corrected this to note that it only works when the serial port is already configured and the device is actively sending data.

## Review Notes
- Raw `/dev/bus/usb/...` mappings are valid on Linux Docker Engine hosts, but USB bus and device numbers can change when hardware is unplugged and reattached.
- For hotplug-heavy workflows, Compose `device_cgroup_rules` may be relevant in addition to `devices`.

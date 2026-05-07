# Validation Summary: How to Use Podman on IoT Devices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Quadlet / systemd user services
- MQTT
- Eclipse Mosquitto
- Python
- paho-mqtt
- Linux device access (`/dev/i2c-*`, GPIO, serial, V4L2)
- Fedora IoT
- Debian / Raspberry Pi OS

## Sources Consulted
- Podman `podman-run` reference: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-create` reference: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman-network-create` reference: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-container.unit` reference: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman `podman-auto-update` reference: https://docs.podman.io/en/v5.8.0/markdown/podman-auto-update.1.html
- Podman `podman-generate-systemd` reference: https://docs.podman.io/en/v4.4/markdown/podman-generate-systemd.1.html
- Podman `podman-info` reference: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Eclipse Paho MQTT Python client docs: https://eclipse.dev/paho/files/paho.mqtt.python/html/index.html
- Eclipse Mosquitto migration guide: https://mosquitto.org/documentation/migrating-to-2-0/
- Eclipse Mosquitto config man page: https://mosquitto.org/man/mosquitto-conf-5.html
- Docker Official Image for `eclipse-mosquitto`: https://hub.docker.com/_/eclipse-mosquitto/
- Debian package metadata for `podman`: https://packages.debian.org/bookworm/podman
- Debian package metadata for `uidmap`: https://packages.debian.org/bookworm/uidmap
- Debian package metadata for `fuse-overlayfs`: https://packages.debian.org/bookworm/fuse-overlayfs

## Issues Found
- The Debian install command omitted `uidmap`, which is recommended by Debian for Podman and needed for the `newuidmap`/`newgidmap` helpers used by common rootless setups. I added `uidmap` to the install line.
- Several `iot/sensor-reader:latest` run examples omitted a writable `/data` mount even though the sample app writes to `/data/readings.jsonl` by default. I added the missing volume mounts in the I2C, hardening, and network-isolation examples.
- The `--group-add keep-groups` example did not account for Podman’s runtime requirement. Podman documents `keep-groups` as currently available only with the `crun` OCI runtime, so I added `--runtime crun` to that example.
- The pod-based MQTT stack published port `1883` while the Mosquitto container in that example had no listener configuration. Mosquitto 2.x runs in local-only mode without configured listeners, so publishing `1883` there was misleading. I removed the pod-level `1883` publish and left the broker as an internal pod service.
- The Quadlet/user-systemd OTA example omitted `loginctl enable-linger`, which Podman/systemd documentation calls out for keeping user services available after logout and across boot on unattended devices. I added `sudo loginctl enable-linger "$USER"`.
- The read-only container example manually mounted tmpfs on `/tmp` and `/run` even though Podman already mounts writable tmpfs for read-only containers by default. I removed the redundant manual tmpfs mounts.
- The capability-hardening example added `NET_BIND_SERVICE` even though the sample sensor app does not bind privileged ports, and it also lacked the required writable data volume. I removed the unnecessary capability and added the data volume.
- The internal-network example claimed the gateway had external access while attaching it only to an `--internal` network. Podman documents that internal bridge networks suppress default external routing. I attached the gateway to both `bridge` and `iot-internal` so the example matches the explanation.
- The monitoring script wrote directly to `/usr/local/bin` without elevated privileges. I changed it to use `sudo tee` and `sudo chmod` so the commands work on a typical Linux install.
- The push-update script reported the first local image after `podman load`, which does not reliably identify the image that was just imported. I changed it to print the actual `podman load` output instead.

## Review Notes
- Commands were validated against official documentation and package metadata. They were not executed locally because Podman is not installed in the review environment.
- On SELinux-enabled systems such as Fedora IoT, rootless `--device` usage can still require additional host policy changes, such as `container_use_devices=true`, depending on the device and labeling.
- The hardware minimums in the post are reasonable for small Podman/MQTT workloads, but real requirements remain workload-dependent, especially for camera or analytics containers.

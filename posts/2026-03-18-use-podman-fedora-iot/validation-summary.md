# Validation Summary: How to Use Podman on Fedora IoT

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fedora IoT
- Podman
- Quadlet / systemd
- rpm-ostree
- MQTT / Eclipse Mosquitto
- Python container images
- Podman networking, pods, volumes, and hardware passthrough

## Sources Consulted
- Fedora IoT image-builder docs: https://docs.fedoraproject.org/en-US/iot/using-image-builder/
- Fedora ARM installation wiki: https://fedoraproject.org/wiki/Architectures/ARM/Installation
- Fedora IoT aarch64 images directory: https://download.fedoraproject.org/pub/alt/iot/44/IoT/aarch64/images/
- Fedora IoT x86_64 images directory: https://download.fedoraproject.org/pub/alt/iot/44/IoT/x86_64/images/
- Podman info docs: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman Quadlet container unit docs: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman auto-update docs: https://docs.podman.io/en/latest/markdown/podman-auto-update.1.html
- Podman healthcheck run docs: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- Podman container inspect docs: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- rpm-ostreed.conf upstream man source: https://raw.githubusercontent.com/coreos/rpm-ostree/main/man/rpm-ostreed.conf.xml
- Docker Official Image docs for Eclipse Mosquitto: https://hub.docker.com/_/eclipse-mosquitto/
- Python 3.12 slim Dockerfile: https://raw.githubusercontent.com/docker-library/python/master/3.12/slim-bookworm/Dockerfile

## Issues Found
- The installation commands hard-coded Fedora IoT 39 image names, which were outdated. I updated them to current Fedora IoT 44 raw image filenames from the official download directories.
- The SSH example used `user@...` immediately after raw-image provisioning. With `arm-image-installer --addkey`, the raw-image path is oriented around SSH access to the provisioned system root account, so I updated the text and command to `root@...` for raw-image-based devices.
- The Mosquitto example mounted an empty named volume over `/mosquitto/config` and exposed port `9001` without providing a matching custom `mosquitto.conf`. That would override the image's default configuration and make the example unreliable, so I simplified it to the default working broker on port `1883`.
- The Quadlet example used `python:3.12-slim` without an `Exec=` command. That image defaults to `CMD ["python3"]`, so the service would not run the intended long-lived workload. I added an explicit `Exec=` command so the service stays up and serves on the published port.
- The auto-update section implied that enabling `rpm-ostreed-automatic.timer` alone is sufficient. rpm-ostree automatic updates also require `AutomaticUpdatePolicy` in `/etc/rpm-ostreed.conf`, so I added that requirement and the `rpm-ostree reload` step.
- The container auto-update section did not mention the systemd/Quadlet requirement. I clarified that Podman auto-updates apply to containers managed by systemd or Quadlet.
- The monitoring section used `podman healthcheck run` and health-state inspection against a container example that had no healthcheck defined. I replaced it with working `systemctl` and `podman container inspect` state checks, and added `sudo` where the commands target the root-owned Quadlet service.
- The logging sentence claimed "centralized logging" but only showed local inspection commands. I corrected the wording to match what the commands actually do.

## Review Notes
- The post is technically accurate as reviewed on 2026-05-07.
- The raw image filenames are release-specific and will age as Fedora IoT releases advance.
- `podman auto-update` only updates containers with a valid auto-update policy that are started from systemd or Quadlet units.

# Validation Summary: How to Create a Quadlet Kube Unit File

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Kubernetes YAML
- ConfigMap
- Podman networks

## Sources Consulted
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman kube play documentation: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- The section titled "Kube with Auto-Build" described `AutoUpdate=registry` as automatically building images referenced in the YAML. Podman documents `AutoUpdate=registry` for Quadlet kube units as an auto-update annotation for registry-backed images, not as an image build setting. I changed the heading to "Kube with Auto-Update" and updated the comment accordingly.

## Review Notes
The examples otherwise match current Podman documentation: `.kube` units use a `[Kube]` section with `Yaml=`, Quadlet reads user units from `~/.config/containers/systemd/`, `Network=backend.network` is valid when a matching `.network` Quadlet exists, ConfigMaps can be used by `podman kube play`, and `[Install] WantedBy=default.target` is the supported Quadlet mechanism for startup integration.

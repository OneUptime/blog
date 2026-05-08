# Validation Summary: How to Configure Image Pull Policy in a Quadlet Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Container image pull policies

## Sources Consulted
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman run documentation for `--pull`: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman pull documentation for pull policy semantics: https://docs.podman.io/en/stable/markdown/podman-pull.1.html

## Issues Found
- The post described `Pull=newer` as pulling only when the registry image is newer than the local one. Podman documents this policy as comparing image digests, not timestamps. Updated the policy description, explanatory text, and example comment to say it pulls when the registry image digest differs from the local image.

## Review Notes
- The Quadlet `Pull=` directive is valid for `.container` files and maps to Podman's `--pull` option.
- The documented policy values `missing`, `always`, `never`, and `newer` are current in the latest Podman documentation.
- The rootless Quadlet directory `~/.config/containers/systemd/`, `systemctl --user daemon-reload`, and generated `.service` behavior are consistent with Podman's Quadlet documentation.

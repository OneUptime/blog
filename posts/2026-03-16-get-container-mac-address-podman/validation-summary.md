# Validation Summary: How to Get a Container's MAC Address with podman inspect

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman container inspection
- Podman networking
- Shell commands
- Linux network interfaces

## Sources Consulted
- Podman `podman inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman network` documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman `podman network connect` documentation: https://docs.podman.io/en/latest/markdown/podman-network-connect.1.html
- Red Hat documentation for inspecting container network settings with `podman inspect`: https://docs.redhat.com/ja/documentation/red_hat_enterprise_linux/10/html/building_running_and_managing_containers/inspecting-a-network-settings-of-a-container

## Issues Found
- The introduction implied all container networking modes expose a usable MAC address through the shown Podman inspect paths. Updated it to refer to Ethernet-style interfaces on bridge or user-defined networks, which matches the examples and avoids overclaiming for modes such as rootless `pasta`, `host`, or `none`.
- The "default network" example used `podman run` without `--network`. Current rootless Podman defaults to `pasta`, while rootful Podman uses the default bridge network. Updated the heading and command to explicitly use `--network bridge` so the inspect examples are tied to the bridge network behavior.
- The interface listing example used `/bin/bash`, which is not guaranteed in all container images. Changed it to `/bin/sh` and quoted shell variables inside the loop for portability.

## Review Notes
Podman was not installed in the local workspace, so commands could not be executed locally. The review was performed against official Podman CLI documentation and Red Hat container documentation.

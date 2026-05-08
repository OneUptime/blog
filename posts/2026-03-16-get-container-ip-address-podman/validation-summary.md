# Validation Summary: How to Get a Container's IP Address with podman inspect

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container networking
- Podman inspect Go templates
- Shell commands

## Sources Consulted
- Podman `podman inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman `podman network` documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman `podman network connect` documentation: https://docs.podman.io/en/latest/markdown/podman-network-connect.1.html
- Podman `podman exec` documentation: https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- Podman `podman info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Red Hat documentation for inspecting container network settings with Podman: https://docs.redhat.com/ja/documentation/red_hat_enterprise_linux/10/html/building_running_and_managing_containers/inspecting-a-network-settings-of-a-container
- Podman inspect network field definitions: https://pkg.go.dev/github.com/containers/podman/v3@v3.4.7/libpod/define#InspectBasicNetworkConfig

## Issues Found
- The "Get the subnet" example used `.IPPrefixLen`, which returns the subnet prefix length, not the subnet CIDR itself. Updated the comment and output label to "subnet prefix length" / "Prefix length" to match the field's actual meaning.

## Review Notes
The reviewed commands and Go template fields are consistent with Podman documentation. The quick `.NetworkSettings.IPAddress` approach is valid for bridge-style/rootful networking, and the post correctly notes that rootless/default networking can return an empty IP and that port mappings may be more appropriate in that case.

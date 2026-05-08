# Validation Summary: How to Run a Container with a Specific Network in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containers
- Container networking
- Bridge networks
- Host networking
- Static IP and MAC addressing

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-network` documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman `podman-network-create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-network-connect` documentation: https://docs.podman.io/en/stable/markdown/podman-network-connect.1.html
- Podman `podman-network-disconnect` documentation: https://docs.podman.io/en/v4.8.3/markdown/podman-network-disconnect.1.html
- Podman `podman-network-rm` documentation: https://docs.podman.io/en/latest/markdown/podman-network-rm.1.html
- Podman `podman-network-inspect` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html

## Issues Found
- The post said Podman containers use a bridge network by default. Current Podman documentation distinguishes rootful containers, which default to the `podman` bridge network, from rootless containers, which default to user-mode networking such as `pasta`. Updated the introduction to reflect that distinction.
- The post stated that DNS resolution between containers on the same custom network is automatic. Podman supports container name and alias resolution when DNS is enabled for the network. Updated the sentence to specify custom bridge networks with DNS enabled.
- The host-network example implied the container always listens directly on host port 80. Updated the comment to note that host port 80 must be available and permitted.
- The `podman network rm -f` example was described only as forcing network removal. Podman documents that `--force` removes containers using that network, stopping running containers first. Updated the comment to make that behavior explicit.

## Review Notes
Podman was not installed in the local workspace, so commands could not be executed locally. The review was performed against official Podman documentation. The examples assume a Linux Podman environment with permission to create networks and pull container images.

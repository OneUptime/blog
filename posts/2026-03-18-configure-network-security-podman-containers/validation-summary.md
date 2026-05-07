# Validation Summary: How to Configure Network Security for Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container networking
- Netavark networking
- DNS configuration
- Linux capabilities
- Port publishing
- Network isolation and segmentation

## Sources Consulted
- Podman `podman-create` / `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman-run` port publishing documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman `podman-network-create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-network` documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman `podman-network-inspect` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman `podman-port` documentation: https://docs.podman.io/en/v4.3/markdown/podman-port.1.html

## Issues Found
- The post described `bridge` as the default Podman network mode without qualifying rootless behavior. Updated the wording to state that bridge is the default for rootful containers, while current rootless containers use pasta/private networking by default.
- The network segmentation example reused `127.0.0.1:8080`, which was already used by the earlier `local-only` container. Changed the `tier-web` example to publish `127.0.0.1:8081:80`.
- The DNS example described `--dns=none` as disabling DNS. Podman documentation says this means Podman does not manage `/etc/resolv.conf`; the image's file is used instead. Updated the comment and expected failure message to avoid overstating the behavior.
- The cleanup commands did not include the `interface-bound` container, which could remain running if the host IP exists and the example succeeds. Added `interface-bound` to the stop and remove commands.

## Review Notes
Podman was not installed in the review environment, so commands could not be executed locally. Validation was performed against official Podman documentation. The post remains current for modern Podman/Netavark behavior, but users on older CNI-based installations may see differences around DNS on internal networks.

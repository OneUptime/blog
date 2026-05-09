# Validation Summary: How to Create an Internal Network with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman container networking
- Podman internal bridge networks
- Netavark and aardvark-dns
- Container DNS and static container IP assignment

## Sources Consulted
- Podman `podman-network-create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-network-connect` documentation: https://docs.podman.io/en/latest/markdown/podman-network-connect.1.html
- Podman `podman-create` documentation for `--network` and `--ip`: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman-network-inspect` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman `podman-network-ls` documentation: https://docs.podman.io/en/stable/markdown/podman-network-ls.1.html
- Podman `podman-network` documentation for Netavark/CNI backend notes: https://docs.podman.io/en/stable/markdown/podman-network.1.html

## Issues Found
- The introduction described internal networks as "completely blocking access to and from external networks" and said they have "no gateway to the outside world." Podman's official documentation is more precise: `--internal` restricts external access for bridge networks, disables IP forwarding on the bridge interface, and does not add a default route to containers. The wording was updated to avoid overstating the mechanism.
- The DNS section said internal networks generally support DNS resolution between containers. Current Podman with Netavark/aardvark-dns does resolve container names on internal networks, but the official documentation notes that legacy CNI automatically disables DNS for `--internal`. The wording was updated to scope the claim to the current Netavark/aardvark-dns backend.
- The external DNS failure example used a specific `nslookup` error string. Podman's documentation says aardvark-dns answers non-container-name queries with `NXDOMAIN` on internal networks. The example output was updated to avoid relying on one tool-specific message.

## Review Notes
The command syntax for `podman network create --internal`, `--subnet`, `--gateway`, `podman run --network`, `--ip`, `podman network connect`, `podman network inspect --format '{{ .Internal }}'`, and `podman network ls --format "{{ .Name }}"` matches official Podman documentation. Podman was not installed in the local review environment, so commands were validated against official documentation rather than executed locally.

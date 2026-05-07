# Validation Summary: How to Set a Static MAC Address for a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman container networking
- Bridge networks
- Macvlan networks
- DHCP IPAM
- MAC addressing

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman inspect documentation: https://docs.podman.io/en/v5.0.0/markdown/podman-inspect.1.html
- RFC 9542, IANA Considerations and IETF Protocol and Documentation Usage for IEEE 802 Parameters: https://www.rfc-editor.org/rfc/rfc9542.html

## Issues Found
- The DHCP reservation example used the previously created `lan-net` network, which was configured with host-local/static IPAM, while the text said the container would get its address from DHCP. Updated the example to enable `netavark-dhcp-proxy.socket`, create a macvlan network with `--ipam-driver dhcp`, and run the DHCP client container on that DHCP-backed network.
- The macvlan static-address example described `--ip 192.168.1.200` as a DHCP reservation. Changed the comment to say it assigns a specific MAC and IP address, because the command uses a static Podman IP assignment.
- The custom-network verification command used `ip addr` inside an nginx container, which may not include the `ip` utility. Changed it to use `podman inspect --format`, matching Podman's documented inspect formatting support.

## Review Notes
Podman was not installed in the local environment, so command behavior was verified against official Podman documentation rather than local `--help` output. The post assumes Linux/rootful Podman for macvlan examples; Podman documentation notes that macvlan networks can only be used as root and that rootless macvlan does not have access to host network interfaces.

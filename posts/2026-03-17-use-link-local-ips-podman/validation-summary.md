# Validation Summary: How to Use Link-Local IPs with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container networking
- IPv4 link-local addressing
- IPv6 link-local addressing
- Linux container network interfaces

## Sources Consulted
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- RFC 3927, Dynamic Configuration of IPv4 Link-Local Addresses: https://www.rfc-editor.org/rfc/rfc3927
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291

## Issues Found
- The post implied that `podman network create --disable-dns linklocal-net` creates a network without a subnet. Podman documentation says that if no options are provided, Podman assigns a free subnet, and `--disable-dns` only disables DNS. I changed the network creation example to use `--ipam-driver none`, which Podman documents as assigning no IP addresses to interfaces.
- The post implied Podman would automatically assign IPv4 link-local addresses on ordinary container runs. Podman documents `--link-local-ip` as not implemented, and its default bridge/user-defined networks use Podman IPAM rather than IPv4 link-local autoconfiguration. I narrowed the automatic example to IPv6 link-local address inspection and adjusted the description and summary to avoid implying automatic IPv4 link-local assignment.
- The manual IPv4 link-local example used `ip addr add` inside the container without granting the required network administration capability. I added `--cap-add=NET_ADMIN` to the container run command.
- The introductory explanation described link-local addresses as useful for lightweight service discovery. Link-local addressing alone does not provide service discovery. I changed this to interface-scoped communication.

## Review Notes
Manual IPv4 link-local assignment is possible for test setups, but RFC 3927 recommends against manual configuration of the 169.254/16 prefix because proper duplicate-address detection and conflict handling are part of IPv4 link-local autoconfiguration.

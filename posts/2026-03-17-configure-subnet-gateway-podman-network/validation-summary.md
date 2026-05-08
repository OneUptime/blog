# Validation Summary: How to Configure Subnet and Gateway for a Podman Network

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman container networking
- IPv4 and IPv6 subnets
- Container static IP assignment
- Linux routing inspection

## Sources Consulted
- Podman official documentation: `podman network create` - https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman official documentation: `podman network inspect` - https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman official documentation: `podman network ls` - https://docs.podman.io/en/stable/markdown/podman-network-ls.1.html
- Podman official documentation: `podman run --ip` - https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The `--ip-range 10.50.0.100/25` example was invalid because Podman's CIDR form for `--ip-range` must be a complete subnet, and `10.50.0.100/25` is not a valid /25 network address. Changed it to Podman's documented start-end syntax, `--ip-range 10.50.0.100-10.50.0.254`, preserving the intended assignable range.
- The section heading "Using /16 and /8 Subnets" referenced `/8` subnets, but the section only showed a `/16` example. Changed the heading to "Using /16 Subnets" to match the content.
- The summary said to use different subnets to enforce network isolation. Subnets alone do not enforce isolation; separate Podman networks provide the isolation boundary. Updated the sentence to say "Use different networks with different subnets".

## Review Notes
Podman was not installed in the local environment, so commands could not be executed locally. The command syntax and behavior were validated against the current official Podman documentation instead.

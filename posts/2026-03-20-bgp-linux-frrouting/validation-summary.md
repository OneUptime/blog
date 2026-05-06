# Validation Summary: How to Configure BGP on Linux Using FRRouting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Border Gateway Protocol (BGP)
- FRRouting (FRR)
- Linux networking
- Debian/Ubuntu APT repository configuration
- `vtysh` CLI

## Sources Consulted
- FRR BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRR Basic Setup documentation: https://docs.frrouting.org/en/stable-10.4/setup.html
- FRR Installation documentation: https://docs.frrouting.org/en/stable-10.4/installation.html
- FRR Debian repository instructions: https://deb.frrouting.org/
- Debian `apt-key(8)` man page: https://manpages.debian.org/unstable/apt/apt-key.8.en.html
- RFC 4271, BGP-4: https://www.rfc-editor.org/rfc/rfc4271
- RFC 4456, BGP Route Reflection: https://www.rfc-editor.org/rfc/rfc4456

## Issues Found
- The install section used the deprecated `apt-key` workflow. It was replaced with FRR's current keyring-based `signed-by=` repository setup from the official FRR Debian repository instructions.
- The install commands mixed privileged and unprivileged APT/systemd usage. `sudo` was added to the package install, daemon-file edit, and service restart commands so the snippet works as written on typical Ubuntu/Debian systems.
- The Linux iBGP example used `update-source lo0`, which is not the default loopback interface name on Linux. It was corrected to `update-source lo`.
- The post implied that `network PREFIX` always advertises a prefix. It was clarified that, in current FRR defaults, the prefix must exist in the local routing table for the `network` statement to advertise it.

## Review Notes
- The BGP and route-reflector explanations are technically sound at a high level and align with RFC 4271 and RFC 4456.
- The loopback-based iBGP example assumes the loopback addresses are configured and reachable through the underlay; the post does not walk through that prerequisite.
- The post configures FRR through `vtysh`, but does not mention saving the running configuration for persistence across restarts.

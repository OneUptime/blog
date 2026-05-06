# Validation Summary: How to Configure a Bridge with Netplan

## Status
validated

## Post Type
Guide

## Technologies Covered
- Netplan
- Linux bridge networking
- Ubuntu
- Debian
- KVM/libvirt host networking
- `iproute2` (`ip` and `bridge`)

## Sources Consulted
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan bridge examples: https://netplan.readthedocs.io/en/0.107/examples/
- Netplan CLI reference: https://netplan.readthedocs.io/en/stable/cli/
- Netplan `apply` command reference: https://netplan.readthedocs.io/en/0.107/netplan-apply/
- Netplan guide for a VM host with a single network interface: https://netplan.readthedocs.io/en/stable/single-nic-vm-host/
- Local `bridge` CLI help (`bridge link help`, `bridge fdb help`)
- Local `ip` CLI help (`ip -d link help`)

## Issues Found
- The `Bridge with DHCP` example was not a standalone valid Netplan document and referenced `eth0` under `interfaces` without defining it under `ethernets`. I expanded it into a complete `network:` example and defined `eth0` with `dhcp4: false`, because Netplan requires bridge member interfaces to also be defined in the configuration.
- The `Bridge with STP Enabled` example had the same issue: it referenced `eth0` without defining it and was shown as an incomplete document fragment. I converted it into a complete valid Netplan example with `network.version`, `ethernets`, and the bridge definition.
- The KVM no-IP bridge comment was too loose for a single-interface host example. I changed the comment to make clear that a bridge with no address leaves the host itself not addressable on that network, which matches Netplan's documented behavior for addressless virtual interfaces.
- The conclusion omitted the requirement that interfaces listed under `bridges.<name>.interfaces` must also be defined in the Netplan configuration. I corrected that statement.

## Review Notes
- The YAML keys and bridge parameters used in the post are current and valid in Netplan.
- The verification commands are valid with current `iproute2` syntax.
- The corrected DHCP and STP examples were parsed successfully with `netplan generate --root-dir` during review.
- Netplan documents several bridge timing parameters as mapping to the `networkd` renderer; behavior can vary by backend even though the YAML syntax itself is valid.

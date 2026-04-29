# Validation Summary: How to Configure LXC/LXD Containers with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- LXD managed bridge networking
- `lxc` CLI
- IPv6
- SLAAC
- DHCPv6
- `dnsmasq`
- Linux firewalling (`nftables` / `ip6tables`)

## Sources Consulted
- LXD bridge network reference: https://documentation.ubuntu.com/lxd/default/reference/network_bridge/
- LXD network creation and attachment guide: https://documentation.ubuntu.com/lxd/v5/howto/network_create/
- LXD NIC device reference: https://documentation.ubuntu.com/lxd/latest/reference/devices_nic/
- LXD profile usage guide: https://documentation.ubuntu.com/lxd/v5/profiles/
- LXD firewall guidance for managed bridges: https://documentation.ubuntu.com/lxd/stable-5.0/howto/network_bridge_firewalld/
- `lxc network create` man page: https://documentation.ubuntu.com/lxd/stable-5.21/reference/manpages/lxc/network/create/
- `lxc network set` man page: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/network/set/
- `lxc list` man page: https://documentation.ubuntu.com/lxd/stable-5.21/reference/manpages/lxc/list/
- `lxc network list-leases` man page: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/network/list-leases/
- `lxc monitor` man page: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/monitor/
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291

## Issues Found
- The post used invalid IPv6 literals such as `fd00:lxd::/64` and `2001:db8:lxd::/64`, and it used prefix-only values where LXD expects a bridge address in CIDR form. I replaced them with valid examples such as `fd42:100:100::1/64` and `2001:db8:100::1/64`.
- The bridge explanation said LXD configures `radvd or dnsmasq`. Current LXD bridge documentation states that managed bridges use a local `dnsmasq` process for DHCP, IPv6 router advertisements, and DNS. I corrected that wording.
- The `lxc list ... --format json | ... | grep "IPv6"` example would not reliably show IPv6 addresses from current `lxc list` JSON output. I replaced it with the documented `lxc list web1 -c n6` form.
- The static IPv6 section attached another NIC to a container that had already been launched with `--network`, and it implied a direct static assignment without noting the DHCPv6 requirement. I changed it to update the existing `eth0` device, noted the stateful DHCPv6 dependency, and added a restart so the lease renewal step is explicit.
- The profile example included a `root` disk device even though the launch command already stacked the `default` profile. That unnecessarily forced a storage pool name and could override the default profile’s root disk. I removed the redundant `root` device from the custom networking profile.
- The “routed networking” section actually demonstrated a managed bridge with IPv6 NAT disabled, not LXD’s separate `routed` NIC type. I renamed the section and adjusted the example network name to match what the commands are doing.
- The DHCPv6 section claimed to reserve a specific address using the container DUID, but the command shown only set DHCPv6 ranges. I corrected the section to describe dynamic pool limits and added `lxc network list-leases` as the relevant verification command.
- The firewall section incorrectly stated that LXD uses `nftables` unconditionally and recommended manual `ip6tables` ICMPv6 rules that are not what the official firewall guidance recommends. I updated it to reflect LXD’s `nftables`/`xtables` backend behavior and limited the commands to inspection and bridge firewall verification.
- The troubleshooting section referred to `radvd`, used `lxc network edit` as though it restarted the network, and relied on a snap-specific `journalctl` example. I replaced those with bridge inspection and `lxc monitor`, which matches current LXD documentation and is packaging-agnostic.

## Review Notes
- The post is technically LXD-focused; that is appropriate because the `lxc` CLI is LXD’s client and all networking examples rely on LXD-managed networks.
- The examples still use `ubuntu:22.04` container images. The commands are valid, but the guest image version can be updated separately if the blog wants newer distro examples.
- The non-NAT production example is only correct when the upstream network routes the IPv6 prefix to the LXD host, which the post now states explicitly.

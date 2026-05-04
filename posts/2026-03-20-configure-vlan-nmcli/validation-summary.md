# Validation Summary: How to Configure a VLAN with nmcli

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux NetworkManager
- nmcli (NetworkManager command-line client)
- 802.1Q VLAN tagging
- iproute2 (`ip link`, `ip addr`)
- Linux kernel `8021q` module
- Debian/Ubuntu module loading via `/etc/modules`

## Sources Consulted
- nmcli(1) man page — https://networkmanager.dev/docs/api/latest/nmcli.html
- nm-settings(5) man page (vlan, ipv4 settings) — https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Red Hat Networking guide — Configuring VLAN tagging with nmcli — https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-vlan-tagging_configuring-and-managing-networking
- Linux kernel 8021q module documentation
- ip-link(8) man page — https://man7.org/linux/man-pages/man8/ip-link.8.html

## Issues Found
No technical issues found.

All nmcli syntax (`type vlan`, `dev <parent>`, `id <vlan-id>`, `con-name`), property names (`ipv4.method`, `ipv4.addresses`, `ipv4.gateway`), and the auto-derived `<parent>.<id>` interface naming convention are accurate. The verification commands (`ip link show`, `ip addr show`, `nmcli connection show`) are correct. The `8021q` kernel module name and the Debian/Ubuntu persistence path (`/etc/modules`) are accurate.

## Review Notes
- The `/etc/modules` persistence method is specific to Debian/Ubuntu. RHEL/Fedora/CentOS use `/etc/modules-load.d/<name>.conf` instead. The post does not claim to be distro-agnostic, so this isn't an error, but readers on RHEL-family distros would need a different approach.
- In practice, NetworkManager and the kernel will auto-load the `8021q` module when a VLAN interface is created, so the `modprobe 8021q` step is rarely needed on modern systems — but it's offered as a troubleshooting step, which is appropriate.
- The `ipv4.gateway` property assigns a default gateway via the VLAN; if multiple VLANs each set a gateway, the last/highest-priority one wins. The post doesn't mention this nuance, but the multi-VLAN example correctly omits gateways on the additional VLANs.
- An optional `ifname` parameter can be passed to nmcli to override the auto-derived `<parent>.<id>` name (e.g., `ifname vlan10`). The post uses the default convention, which is fine.

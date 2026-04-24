# Validation Summary: How to Configure IPv6 in Proxmox VE

## Status
validated

## Post Type
Guide

## Technologies Covered
- Proxmox VE networking
- IPv6
- Linux bridges and ifupdown2
- QEMU/KVM and Cloud-Init
- LXC containers
- Linux sysctl
- Proxmox firewall and `pvesh`

## Sources Consulted
- Proxmox VE Network Configuration: https://pve.proxmox.com/wiki/Network_Configuration
- Proxmox VE Cloud-Init Support: https://pve.proxmox.com/wiki/Cloud-Init_Support
- Proxmox VE `pct.conf` manual: https://pve.proxmox.com/wiki/Manual%3A_pct.conf
- Proxmox VE `qm` manual: https://pve.proxmox.com/pve-docs/qm.1.html
- Proxmox VE `qm.conf` manual: https://pve.proxmox.com/wiki/Manual%3A_qm.conf
- Proxmox VE firewall manual: https://pve.proxmox.com/pve-docs/pve-firewall.8.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- RFC 4193: Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862

## Issues Found
- The ULA examples `fd00:vms::1/64` and `fd00:vms::/64` were invalid IPv6 literals because `vms` is not hexadecimal. I changed them to `fd00:100::1/64` and `fd00:100::/64`.
- The network apply section recommended `systemctl restart networking`, but Proxmox documents `ifreload -a` with ifupdown2 or a reboot as the supported apply path. I updated that section accordingly.
- The Cloud-Init VM example was incomplete and mixed in deprecated boot syntax. It used `local:cloudinit`, which is not a generally safe storage example for a cloud-init drive, and `--boot c --bootdisk scsi0`, which Proxmox marks as deprecated. I rewrote the example as configuration for an existing VM, used a storage placeholder, and changed boot configuration to `--boot order=scsi0`.
- The `pct set` example replaced the full `net0` definition but omitted the IPv4 gateway. I added `gw=192.168.1.1` so the example remains internally consistent.
- The forwarding section implied IPv6 forwarding should always be enabled on the host and used `net.ipv6.conf.all.accept_ra = 2`. I corrected that to state forwarding is only needed when the host routes between bridges or subnets, and I made `accept_ra = 2` an optional, uplink-scoped setting for hosts that still need to learn routes from Router Advertisements.
- The firewall example used `-proto ipv6`, which is not valid Proxmox firewall rule syntax. I replaced it with valid example rules and kept the NDP guidance.
- The verification section used an overly specific node name in the `pvesh` example and older `ping6` spelling. I replaced those with generic/current examples.

## Review Notes
- The LXC template filename is environment-specific. The post now marks the template build as a placeholder because the exact file name depends on what is available on the target host.
- No additional structural or stylistic edits were made beyond the technical corrections required for accuracy.

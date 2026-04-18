# Validation Summary: How to Configure IPv6 in VMware vSphere/ESXi

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- VMware vSphere / ESXi
- esxcli CLI (networking subcommands)
- VMkernel network adapters (vmk0, vmk1)
- vCenter Server and vSphere Client
- IPv6 (SLAAC, DHCPv6, static addressing)
- vMotion over IPv6
- ESXi firewall rulesets
- Ubuntu Netplan
- Windows PowerShell networking cmdlets (`New-NetIPAddress`, `New-NetRoute`)

## Sources Consulted
- Broadcom/VMware esxcli Command Reference (ESXi 6.5+): https://www.virten.net/wp-content/uploads/2016/11/esxi65-esxcli-command-reference.txt
- "Add and Configure an IPv6 VMkernel Network Interface with ESXCLI" (Broadcom TechDocs): https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-sdks-tools/7-0/esxcli-concepts-and-examples-7-0/managing-vsphere-networking/setting-up-vsphere-networking-with-vsphere-standard-switches/adding-and-modifying-vmkernel-network-interfaces/add-and-configure-an-ipv6-vmkernel-network-interface-with-esxcli.html
- "Configuring ESXi hosts to use static IPv6 routing by command line" (Broadcom KB 421490): https://knowledge.broadcom.com/external/article/421490/configuring-esxi-hosts-to-use-static-ipv.html
- "Set Up IPv6 on an ESXi Host" (VMware vSphere 7.0 docs): https://docs.vmware.com/en/VMware-vSphere/7.0/com.vmware.vsphere.networking.doc/GUID-DC940579-C2A5-4488-86D1-9437239CDAC3.html
- RFC 4291 (IP Version 6 Addressing Architecture) — IPv6 address format rules
- Netplan reference: https://netplan.io/reference
- Microsoft PowerShell NetTCPIP module documentation (`New-NetIPAddress`, `New-NetRoute`)

## Issues Found
1. **Invalid IPv6 address literal `2001:db8:vmotion::10`** — IPv6 addresses may only contain hex characters (0-9, a-f). The string `vmotion` is not a valid hextet. Replaced with `2001:db8:1::10/64` so the example parses as a real IPv6 address.
2. **Wrong esxcli flag `--ip` for the IPv6 add command** — The documented flag for `esxcli network ip interface ipv6 address add` is `-I|--ipv6=<str>` (the value is in CIDR form `ADDRESS/PREFIX`), not `--ip`. Replaced `--ip 2001:db8::10 --prefix-length 64` with `--ipv6 2001:db8::10/64` (and the equivalent change for the vmk1 example). The separate `--prefix-length` flag is not part of the `ipv6 address add` command as of current ESXi versions; the prefix must be embedded in the `--ipv6` value.
3. **Non-existent firewall ruleset ID `vCenter`** — There is no default ESXi firewall ruleset literally named `vCenter`. The ruleset used for vCenter agent heartbeat traffic is `vpxHeartbeats`. Updated the example accordingly so the command would actually run on a real host.
4. **Code fence language `sql` on the vSphere Client GUI step list** — The block contains numbered GUI instructions, not SQL. Changed the fence to `text` to avoid misleading syntax highlighting.

## Review Notes
- The note that enabling IPv6 on an ESXi host "requires a reboot" is correct — `esxcli network ip set --ipv6-enabled=true` is documented as requiring a host reboot before changes take effect.
- `esxcli network ip route ipv6 add --gateway <gw> --network ::/0` is accepted; VMware docs also show `--network default` as an equivalent way to express the default route. Left as-is since `::/0` is unambiguous.
- `vim-cmd hostsvc/net/vnic_info` does not normally take an interface name as a positional argument; passing `vmk1` is harmless but ignored. Left as-is since the following comment already directs the reader to the vSphere Client to enable vMotion on the adapter, and the intent of the line is illustrative.
- `ping6` is available on most Linux distributions but has been superseded by `ping -6` (or `ping` with an IPv6 target) on modern systems. The example still works where `ping6` is installed.
- The Netplan example is valid for Ubuntu's netplan schema (v2). Readers on newer Ubuntu releases using `networkd` may prefer `routes:` blocks over the deprecated `gateway6:` key, but `gateway6:` continues to work.
- 2001:db8::/32 is the IETF-reserved documentation prefix (RFC 3849) — the correct choice for examples. Good.

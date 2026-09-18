# Validation Summary: How to Set a Persistent Static IP, Gateway, and DNS on Photon OS 5 with nmctl

## Status
validated

## Post Type
Tutorial / configuration guide with shell commands and networkd configuration details.

## Technologies Covered
- Photon OS 5 and its network-config-manager package (`nmctl`).
- systemd-networkd, `.network` files, and `networkctl`.
- systemd-resolved, `resolvectl`, and resolver ownership.
- IPv4 static addressing, default routes, DHCPv4, DNS, and IPv6/DHCPv6 interactions.
- iproute2 and boot-time network configuration generators.

## Sources Consulted
- [Photon OS 5 nmctl command reference](https://vmware.github.io/photon/docs-v5/command-line-reference/command-line-interfaces/photon-network-config-manager-cli/) — persistent configuration and individual address, gateway, and DNS command syntax.
- [Photon OS 5 network configuration manager guide](https://vmware.github.io/photon/docs-v5/administration-guide/managing-network-configuration/using-the-network-configuration-manager/) — networkd integration and YAML/kernel-command-line generators.
- [Photon 5.0 network-config-manager package specification](https://github.com/vmware/photon/blob/5.0/SPECS/network-config-manager/network-config-manager.spec) — package name, nmctl executable, dependencies, and generator services; the inspected branch specifies version 0.7.4.
- [Photon 5.0 systemd package specification](https://github.com/vmware/photon/blob/5.0/SPECS/systemd/systemd.spec) — systemd version history and packaging.
- [Upstream nmctl tests](https://github.com/vmware-archive/network-config-manager/blob/main/tests/cmocka/set-network.c) — combined IPv4 commands, DHCP values, and comma-separated DNS arguments.
- [Upstream CLI help and command table](https://github.com/vmware-archive/network-config-manager/blob/main/src/manager/network-manager-ctl.c) — command registration, help, and version flags.
- [Upstream argument parser](https://github.com/vmware-archive/network-config-manager/blob/main/src/manager/network-config-manager.c) — address aliases, DHCP boolean parsing, and the default `keep = true` behavior.
- [Upstream configuration implementation](https://github.com/vmware-archive/network-config-manager/blob/main/src/manager/network-manager.c) — DNS merging, persistent file writes, DHCP-family handling, and networkd reload.
- [systemd v252 network configuration manual source](https://github.com/systemd/systemd/blob/v252/man/systemd.network.xml) — first-match selection, DHCP values, router-advertisement interaction, DNS settings, and GatewayOnLink.
- [systemd v252 networkctl manual source](https://github.com/systemd/systemd/blob/v252/man/networkctl.xml) — status output and reload/reconfigure ordering.
- [systemd v252 resolvectl manual source](https://github.com/systemd/systemd/blob/v252/man/resolvectl.xml) — resolver status and resolv.conf handling.
- [Official iproute2 ip manual source](https://github.com/iproute2/iproute2/blob/main/man/man8/ip.8) — brief address output and command syntax.
- [NetworkManager nmcli manual](https://networkmanager.dev/docs/api/latest/nmcli.html) — distinction between nmcli and nmctl.
- [RFC 5737](https://www.rfc-editor.org/rfc/rfc5737.html) — documentation-only 192.0.2.0/24 addresses.

## Issues Found
1. **Combined IPv4 operation overstated DNS replacement.** The original text said the command sets the desired IPv4 configuration, which implied the supplied DNS list becomes the complete list. The upstream parser defaults to retaining configuration, and the manager merges supplied DNS servers with existing static entries. Corrected the explanation and instructed readers to review the active network file and remove stale DNS entries.
2. **DHCP fallback omitted its IPv6 implications.** Setting `DHCP=no` removes explicitly enabled DHCPv6 as well as DHCPv4, while router advertisements can still trigger DHCPv6. Added the `DHCP=ipv6` alternative for retaining explicitly enabled DHCPv6 and clarified the router-advertisement exception.
3. **Required privileges were unstated.** Persistent networking changes and edits under `/etc` require administrative privileges. Added a short instruction to run configuration-changing commands and file edits as root or with sudo.

## Review Notes
- Reviewed the post as technical content; it remains relevant and salvageable. Kept the existing sections, examples, and authorial style.
- Confirmed the individual nmctl commands against Photon OS 5 documentation. The space-separated DNS list in `add-dns` and comma-separated list in `set-ipv4` are intentional.
- The combined-operation example is supported by upstream tests and source. Upstream main is not proof of identical behavior in every Photon OS 5 package build, so the existing installed-help compatibility check remains necessary. No deprecated command in the examples was identified in the consulted sources.
- `onlink yes` is valid and documented. It bypasses the kernel gateway-reachability check; it is unnecessary but valid for the example gateway in the connected /24 subnet.
- Confirmed the first matching network file wins and that configuration reload precedes explicit reconfiguration. Confirmed the advice to inspect resolver ownership and boot-time generators before relying on persistence.
- The Photon documentation and upstream test links resolved to the intended resources. The freedesktop HTML manual could not be retrieved by the browsing tool; equivalent official systemd v252 manual sources were used to verify the relevant behavior. The URL is a plausible official manual endpoint, not established as a broken link.
- This was a documentation and source review, not a live Photon VM test. No network settings were applied and no reboot was performed. The post correctly requires runtime and post-reboot checks in the target environment.

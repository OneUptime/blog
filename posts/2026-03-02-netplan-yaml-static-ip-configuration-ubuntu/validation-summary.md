# Validation Summary: How to Write Netplan YAML for Static IP Configuration on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netplan (YAML network configuration)
- Ubuntu (17.10+)
- systemd-networkd
- NetworkManager
- systemd-resolved
- cloud-init (network config integration)
- yamllint
- iproute2 (`ip` command)
- `resolvectl`

## Sources Consulted
- Netplan official YAML reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Netplan examples: https://netplan.readthedocs.io/en/stable/examples/
- `netplan-try(8)` man page: https://manpages.ubuntu.com/manpages/jammy/man8/netplan-try.8.html
- Canonical "Netplan by default in 17.10": https://ubuntu.com/blog/netplan-by-default-in-17-10
- systemd-networkd / systemd-resolved documentation
- NetworkManager `nmcli(1)` man page

## Issues Found

1. **`nm-cli` should be `nmcli`** (line ~289). The NetworkManager CLI command name has no hyphen. Changed `The \`nm-cli\` or the GUI network settings can then manage these connections.` to `The \`nmcli\` command or the GUI network settings can then manage these connections.`

2. **`ipv6-address-generation: none` is not a valid value** (lines ~323-324 in the production-ready example). The only valid values for the `ipv6-address-generation` field are `eui64` and `stable-privacy`. The author's intent (per the inline comment) was to disable IPv6 autoconfiguration, which is properly done with `accept-ra: false` (which tells the kernel not to accept IPv6 Router Advertisements that would trigger SLAAC). Replaced the line with `accept-ra: false` and updated the comment to match.

## Review Notes

- The claim that Netplan replaced `/etc/network/interfaces` "starting with Ubuntu 17.10" is correct for Ubuntu Server; on Desktop, Netplan became the default in 18.04. The post's general statement is acceptable.
- The default timeout for `netplan try` is correctly stated as 120 seconds.
- `gateway4` deprecation in favor of `routes:` with `to: default` is correctly described. The deprecation happened around Netplan 0.103.
- `to: default` works for both IPv4 and IPv6 routes (address family is inferred from the `via:` gateway), so the explicit `to: "::/0"` in the IPv6 example is valid but stylistic — both forms are correct.
- `on-link: true` is a valid Netplan route option for marking routes as directly connected to the interface.
- The interface naming patterns (`eth*`, `ens*`, `enp*s*`, `eno*`) and the systemd predictable network interface naming examples are accurate.
- YAML indentation guidance and the cloud-init disable snippet (`network: {config: disabled}` in `/etc/cloud/cloud.cfg.d/99-disable-network-config.cfg`) are standard and correct.
- File permission guidance (`chmod 600`, `chown root:root`) aligns with Netplan's tightened permission warnings in recent releases.

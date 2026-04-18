# Validation Summary: How to Use VLANs to Segment Management and Data Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IEEE 802.1Q VLAN tagging
- Cisco IOS (VLAN / SVI / VTY ACL configuration)
- Debian ifupdown with `vlan` package (`/etc/network/interfaces`, `vlan-raw-device`)
- iptables (INPUT chain filtering on interface + source)
- Net-SNMP (`snmpd.conf` `agentaddress` directive)
- OpenSSH (`sshd_config` `ListenAddress`)
- PCI-DSS (compliance context)

## Sources Consulted
- Cisco IOS Configuration Guides — "Configuring VLANs", "Configuring VTY access classes", named standard ACL syntax (`ip access-list standard`, `access-class ... in`)
- Debian `vlan` package docs — `/etc/network/interfaces` stanza syntax and `vlan-raw-device` option
- netfilter.org iptables man page — `-i`, `-s`, `-p`, `--dport`, `-j ACCEPT|DROP`
- Net-SNMP `snmpd.conf(5)` — `agentaddress` directive (IP:port form)
- OpenSSH `sshd_config(5)` — `ListenAddress` directive
- PCI-DSS v4.0.1 — requirements 1.2.x/1.4.x (segmentation) and 2.2.7 (encrypted non-console admin access)
- IEEE 802.1Q — native VLAN (untagged) behavior on trunk ports

## Issues Found
- **PCI-DSS claim overstated.** The original post stated "PCI-DSS requires out-of-band management for cardholder systems." PCI-DSS v4.0.1 does not literally mandate out-of-band management; it requires network segmentation controls (req 1.2.x/1.4.x) and encryption of non-console administrative access (req 2.2.7). Out-of-band management is a recommended best practice, not a direct requirement. Updated the compliance row in the benefits table to accurately reflect the actual requirements.

## Review Notes
- The `up ip route add 10.10.0.0/24 dev eth1.10` in the Debian interfaces stanza is redundant: when an address with a /24 netmask is configured on the VLAN sub-interface, the kernel automatically installs the connected route, so the explicit `ip route add` will typically fail with "RTNETLINK answers: File exists". It is harmless at runtime (ifupdown will just log the error) but could be removed in a future revision.
- Native VLAN set to 99 on trunks is a good-practice deviation from the default VLAN 1 and is correctly described.
- The Cisco snippet defines the `MGMT-ONLY` ACL after referencing it under `line vty`; IOS accepts forward references to named ACLs, so this works as written.
- The tag "IPv4" is accurate (all examples use IPv4) but the post does not discuss IPv4-specific topics; this is a tagging choice, not a technical error.
- The description mentions "traffic prioritization" but the body does not cover QoS — minor scope/description mismatch, not a technical error.

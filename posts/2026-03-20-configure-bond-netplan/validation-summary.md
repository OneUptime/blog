# Validation Summary: How to Configure a Bond with Netplan

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- Netplan
- Ubuntu
- Debian
- Ethernet bonding
- LACP / IEEE 802.3ad
- VLANs

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan link aggregation how-to: https://netplan.readthedocs.io/en/latest/creating-link-aggregation/
- Netplan apply command reference: https://netplan.readthedocs.io/en/0.107/netplan-apply/
- Linux bonding driver documentation: https://docs.kernel.org/6.17/networking/bonding.html
- Local installed `netplan` man pages and parser validation via `man 5 netplan`, `man 8 netplan-apply`, and `netplan generate --root-dir`

## Issues Found
- The LACP and round-robin examples were not valid standalone Netplan files as written because the bond member interfaces were referenced under `interfaces` but not defined in the Netplan configuration. I expanded both snippets to full `network:` examples with `version: 2` and `ethernets:` entries so they parse correctly and match Netplan's documented bond structure.
- The command examples used `netplan apply` without privilege escalation. I changed them to `sudo netplan apply` to match the official Netplan usage guidance for applying configuration under `/etc/netplan/`.
- The verification block used simplified `/proc/net/bonding/bond0` output labels that do not match the Linux bonding driver's documented output. I changed `Active Slave` to `Currently Active Slave` and updated the bonding mode line to `Bonding Mode: fault-tolerance (active-backup)`.
- The conclusion said member interfaces "must have `dhcp4: false`". I softened this to the technically correct conditional form because that applies when the member interfaces are explicitly defined separately in Netplan; the blanket statement was too absolute.

## Review Notes
- The corrected YAML snippets were validated locally with `netplan generate --root-dir` and parsed successfully.
- `802.3ad` depends on switch-side LACP support, and `balance-rr` typically requires the switch ports to be configured for EtherChannel/trunking.
- For remote systems, `netplan try` is usually safer than `netplan apply`, but the post's use of `sudo netplan apply` is technically correct.

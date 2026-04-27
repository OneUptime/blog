# Validation Summary: How to Configure OSPF on a Firewall (pfSense, Palo Alto, Fortinet)

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OSPF (Open Shortest Path First) routing protocol
- pfSense with FRR (FRRouting) package
- FRR `vtysh` CLI
- Palo Alto Networks PAN-OS (Virtual Router OSPF, GUI and CLI)
- Palo Alto Networks security policy / App-ID (`ospf` application)
- Fortinet FortiGate FortiOS CLI (`config router ospf`)

## Sources Consulted
- FRRouting OSPFv2 documentation: https://docs.frrouting.org/en/latest/ospfd.html
- Palo Alto Networks PAN-OS Networking Admin Guide — Configure OSPF: https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-networking-admin/ospf/configure-ospf
- Palo Alto Networks PAN-OS — OSPF Routing Profiles ("Dead Counts" field): https://docs.paloaltonetworks.com/pan-os/10-2/pan-os-networking-admin/advanced-routing/create-ospf-routing-profiles
- Palo Alto Networks Applipedia (predefined `ospf` App-ID): https://applipedia.paloaltonetworks.com/
- Fortinet FortiOS router/ospf CLI schema (via fortios_router_ospf Ansible module reference): https://docs.ansible.com/projects/ansible/latest/collections/fortinet/fortios/fortios_router_ospf_module.html
- Fortinet community KB — OSPF/BGP/static troubleshooting commands: https://community.fortinet.com/t5/FortiGate/Troubleshooting-Tip-FortiOS-routing-RIP-OSPF-BGP-static-routes/ta-p/198593

## Issues Found
- **FortiGate `config ospf-interface` had an invalid `set area 0.0.0.0` line.** In FortiOS, area assignment is done via `config network` (using `set prefix` + `set area`), not inside `config ospf-interface`. The valid attributes for `config ospf-interface` are interface, ip, authentication, priority, hello-interval, dead-interval, retransmit-interval, transmit-delay, cost, network-type, mtu, mtu-ignore, etc. — `area` is not among them. Removed the `set area 0.0.0.0` line; the existing `config network` block (which already correctly maps `10.0.0.0/30` to area `0.0.0.0`) handles the area assignment.

## Review Notes
- The PAN-OS CLI commands shown are valid for the legacy virtual-router OSPF path. PAN-OS 11.x with the Advanced Routing Engine uses a different hierarchy (`set network routing logical-router ... routing-profile ospf ...`). The example in the post is correct for standard (non-Advanced Routing) deployments, which remains the default on most PAN-OS versions.
- The FRR `ospf router-id A.B.C.D` form used in the `vtysh` heredoc is the documented canonical syntax (plain `router-id` also works).
- The PAN-OS GUI field "Dead Counts" is the documented name (default value 4, range 3–20); the dead interval is `Dead Counts × Hello Interval`.
- The `ospf` application in the PAN-OS security policy example is a valid predefined App-ID.
- The FRR config example does not include `end` / `write memory` to persist the running config; this is a stylistic omission rather than a technical error, since the heredoc applies the commands successfully.

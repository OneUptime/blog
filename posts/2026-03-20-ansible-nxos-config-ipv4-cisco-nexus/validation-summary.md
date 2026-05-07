# Validation Summary: How to Use Ansible nxos_config for IPv4 on Cisco Nexus

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- Cisco NX-OS
- Cisco Nexus
- IPv4 interface configuration
- VLANs and SVIs
- OSPFv2
- HSRPv2

## Sources Consulted
- Ansible `cisco.nxos.nxos_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/nxos/nxos_config_module.html
- Ansible NXOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_nxos.html
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, Release 10.6(x), OSPFv2 configuration: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/unicast-routing-configuration/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide.pdf
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, Release 10.6(x), HSRP configuration: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/unicast-routing-configuration/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide/m_configuring_hsrp.html
- Cisco Nexus 5000 Series NX-OS Layer 2 Interfaces Command Reference, `state` command: https://www.cisco.com/c/en/us/td/docs/switches/datacenter/nexus5000/sw/command/reference/layer2/n5k-l2-cr/n5k-l2_cmds_s.html

## Issues Found
- The inventory used short `ansible_network_os` and `ansible_connection` values. I changed them to `cisco.nxos.nxos` and `ansible.netcommon.network_cli` to match current Ansible platform documentation.
- The feature-enable task turned on `bgp` even though the playbook does not configure BGP, and it omitted `feature hsrp`, which is required before configuring HSRP. I replaced `feature bgp` with `feature hsrp`.
- The SVI IP address and HSRP virtual IP were both set to `10.1.10.1`. I changed the SVI address to `10.1.10.2/24` so the interface keeps a unique real address and the HSRP group keeps the virtual gateway IP.
- The HSRP example placed `ip`, `priority`, and `preempt` under the interface parent instead of the HSRP group submode. I split it into an interface-level `hsrp version 2` task and a nested `parents` hierarchy for `hsrp 1`.
- The introduction and conclusion described `nxos_config` as generically idempotent. I tightened the wording to match the Ansible documentation, which requires full-form commands that match the running configuration for idempotency and correct diffs.
- The backup example included `lines: []` even though the documented backup usage does not require it. I removed the empty list so the example matches the supported pattern directly.

## Review Notes
- The Ansible CLI tools are not installed in this workspace, so command syntax was verified against official documentation rather than local `--help` output.
- The HSRP example is syntactically correct after the fix, but actual first-hop redundancy requires at least two HSRP peers. The post’s single-switch inventory demonstrates configuration syntax, not a complete redundant topology.

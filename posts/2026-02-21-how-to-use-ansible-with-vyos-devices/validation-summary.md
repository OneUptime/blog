# Validation Summary: How to Use Ansible with VyOS Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible `vyos.vyos` collection
- Ansible `ansible.netcommon.network_cli`
- VyOS
- VyOS firewall, NAT, IPsec VPN, OSPF, SSH, syslog, and NTP configuration

## Sources Consulted
- Ansible VyOS platform options: https://docs.ansible.com/ansible/latest/network/user_guide/platform_vyos.html
- Ansible `vyos.vyos.vyos_config` module documentation: https://docs.ansible.com/ansible/latest/collections/vyos/vyos/vyos_config_module.html
- Ansible `vyos.vyos.vyos_facts` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vyos/vyos/vyos_facts_module.html
- Ansible network getting started guide: https://docs.ansible.com/projects/ansible/latest/network/getting_started/first_playbook.html
- VyOS 1.5 Ansible example: https://docs.vyos.io/en/1.5/configexamples/ansible.html
- VyOS 1.5 zone-based firewall documentation: https://docs.vyos.io/en/1.5/configuration/firewall/zone.html
- VyOS 1.5 IPv4 firewall documentation: https://docs.vyos.io/en/1.5/configuration/firewall/ipv4.html
- VyOS 1.5 NAT44 documentation: https://docs.vyos.io/en/1.5/configuration/nat/nat44.html
- VyOS 1.5 IPsec site-to-site VPN documentation: https://docs.vyos.io/en/1.5/configuration/vpn/ipsec/site2site_ipsec.html
- VyOS 1.4 and 1.5 NTP documentation: https://docs.vyos.io/en/1.4/configuration/service/ntp.html
- VyOS syslog documentation: https://docs.vyos.io/en/latest/configuration/system/syslog.html
- VyOS OSPF documentation: https://docs.vyos.io/en/1.4/configuration/protocols/ospf.html
- VyOS SSH documentation: https://docs.vyos.io/en/stable/configuration/service/ssh.html

## Issues Found
- The facts example displayed `ansible_net_interfaces`, but the current `vyos_facts` return documentation does not list that fact from `gather_subset: all`. Removed that line and kept the documented hostname, version, and model facts.
- The NTP example used `set system ntp server`, but VyOS current documentation uses `set service ntp server`. Updated both NTP commands.
- The syslog remote host example used older remote logging syntax. Updated the remote logging command to `set system syslog remote ...` to match current VyOS documentation.
- The firewall example used older `zone-policy zone` and `firewall name` syntax. Updated zone commands to `set firewall zone ...` and IPv4 rulesets to `set firewall ipv4 name ...`.
- The firewall state rules used the older `state established enable` / `state related enable` form. Updated them to current `state established` and `state related` syntax.
- The NAT examples omitted the `name` selector under `inbound-interface` and `outbound-interface`. Updated those commands to `inbound-interface name eth0` and `outbound-interface name eth0`.
- The VPN play targeted `vyos_edge-01`, which did not match the inventory host `vyos-edge-01`. Updated the host pattern.
- The IPsec example used older peer and pre-shared-secret syntax. Updated it to current VyOS site-to-site IPsec syntax with a named peer, separate PSK authentication object, local/remote IDs, `default-esp-group`, `remote-address`, and `set vpn ipsec interface eth0`.
- The version caveat described 1.3.x as current. Updated it to refer to maintained documentation versions including 1.4.x, 1.5.x, and rolling releases.

## Review Notes
The examples are now aligned with current VyOS documentation, but VyOS CLI syntax is version-sensitive. Users should still test against the exact VyOS release they run. The SSH example disables password authentication while the inventory shows password authentication; in real deployments, SSH keys should be configured before applying that task.

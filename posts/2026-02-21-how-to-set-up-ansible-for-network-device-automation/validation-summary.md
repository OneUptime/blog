# Validation Summary: How to Set Up Ansible for Network Device Automation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible and ansible-core
- Ansible Galaxy collections
- ansible.netcommon network connection plugins
- Cisco IOS, Cisco NX-OS, Arista EOS, Junos OS, and VyOS collections
- NETCONF, network_cli, and httpapi
- Ansible inventory, group variables, playbooks, and ansible.cfg

## Sources Consulted
- Ansible installation guide: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible network automation differences: https://docs.ansible.com/projects/ansible/latest/network/getting_started/network_differences.html
- ansible.netcommon.network_cli connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/network_cli_connection.html
- ansible.netcommon.netconf connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/netconf_connection.html
- ansible.netcommon.httpapi connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/httpapi_connection.html
- ansible.netcommon.net_ping module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/net_ping_module.html
- ansible.builtin.ping module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- cisco.ios.ios_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_facts_module.html
- cisco.ios.ios_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- cisco.ios.ios_ping module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_ping_module.html
- cisco.nxos.nxos_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/nxos/nxos_config_module.html
- arista.eos.eos_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_config_module.html
- junipernetworks.junos.junos_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/junipernetworks/junos/junos_config_module.html

## Issues Found
- The installation section recommended `paramiko` for network automation dependencies. Current `ansible.netcommon.network_cli` documentation marks the Paramiko SSH backend as deprecated and recommends migrating to libssh with `ansible-pylibssh`, so the command was updated.
- The installation section listed `xmltodict` as an additional dependency for NETCONF/REST usage. The official NETCONF connection and Junos module documentation require `ncclient`; the unsupported extra dependency was removed.
- The post described `httpapi` as a REST API connection. The official plugin is an HTTP(S)-based API connection and not necessarily REST, so the wording and snippet comment were corrected.
- The backup playbook targeted `all_network` but did not include Junos devices. A Junos backup task using `junipernetworks.junos.junos_config` was added, and the directory structure now includes `backups/junos/`.
- The IOS baseline playbook used `ios_config` to run `crypto key generate rsa modulus 2048`. That command is interactive and not suitable as an idempotent configuration line, so it was removed from the `ios_config` task.
- The connectivity test used the generic `ping` module, which official Ansible documentation says requires Python on the remote node and is not for network targets. The example now uses `cisco.ios.ios_facts` to verify Ansible connectivity and keeps `cisco.ios.ios_ping` for ICMP reachability from a device.
- The `ansible.cfg` example included a Paramiko-specific host key setting. It was replaced with the documented `ssh_type = auto` setting under `[persistent_connection]`.
- The Junos collection is currently documented as deprecated and scheduled for removal from Ansible 14, so a note was added to check current Junos collection guidance before starting new Junos automation projects.

## Review Notes
The examples remain illustrative and depend on device OS versions, enabled services, credentials, and device-specific capabilities. `host_key_checking = False` and `ansible_httpapi_validate_certs: false` are convenient for lab environments but should be avoided or tightly controlled in production.

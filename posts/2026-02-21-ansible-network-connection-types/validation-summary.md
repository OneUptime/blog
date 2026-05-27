# Validation Summary: How to Use Ansible Network Connection Types (network_cli, httpapi, netconf)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible network connection plugins
- ansible.netcommon.network_cli
- ansible.netcommon.httpapi
- ansible.netcommon.netconf
- Cisco IOS, Cisco IOS-XE, Cisco NX-OS
- Arista EOS eAPI
- Juniper Junos NETCONF
- NETCONF, YANG, XML, JSON, HTTP(S), SSH

## Sources Consulted
- Ansible ansible.netcommon.network_cli connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/network_cli_connection.html
- Ansible ansible.netcommon.httpapi connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/httpapi_connection.html
- Ansible ansible.netcommon.netconf connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/netconf_connection.html
- Ansible ansible.netcommon.default NETCONF plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/default_netconf.html
- Ansible network platform index: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_index.html
- Ansible EOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_eos.html
- Ansible Junos OS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_junos.html
- Ansible NETCONF-enabled platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_netconf_enabled.html
- Ansible cisco.ios.ios_vlans module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_vlans_module.html
- Ansible arista.eos.eos_vlans module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_vlans_module.html
- Ansible cisco.nxos.nxos_command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/nxos/nxos_command_module.html
- Ansible junipernetworks.junos.junos_command and junos_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/junipernetworks/junos/
- RFC 6241, NETCONF Protocol: https://www.rfc-editor.org/rfc/rfc6241

## Issues Found
- The `network_cli` tuning example used `ansible_persistent_connect_retry_timeout` as a retry count and `ansible_persistent_command_timeout` as a keepalive setting. Current Ansible docs use `ansible_network_cli_retries` for connection attempts, `ansible_command_timeout` for command timeout, and `ansible_buffer_read_timeout` for post-prompt read time. Updated the snippet accordingly.
- The `httpapi` section described the connection as strictly HTTPS/REST with JSON payloads and responses. Current Ansible docs define it as an HTTP(S)-based API connection, and platform APIs can vary. Updated the wording to HTTP or HTTPS and structured responses, often JSON.
- The NETCONF section stated that NETCONF operations are always transactional and automatically roll back the entire change on failure. RFC 6241 makes rollback and confirmed commit behavior capability-dependent. Updated the wording to describe transactional workflows as dependent on advertised NETCONF capabilities.
- The NETCONF operations list used `commit/discard`; RFC 6241 names the discard operation `discard-changes`. Updated the operation name.
- The Cisco IOS-XE NETCONF example used `ansible_network_os: cisco.ios.ios`, but current Ansible platform documentation does not list Cisco IOS as a NETCONF-enabled network OS plugin. Updated the example to use the standards-based `ansible.netcommon.default` NETCONF plugin.
- The final NETCONF recommendation implied that NETCONF should be used categorically for Juniper devices. Updated it to focus on model-driven configuration, YANG data models, and device-supported transactional capabilities.

## Review Notes
- The `junipernetworks.junos` collection is currently marked deprecated in Ansible community documentation and scheduled for removal from Ansible 14. The examples are still documented today, but future revisions should consider Juniper's `juniper.device` collection for new Junos content.

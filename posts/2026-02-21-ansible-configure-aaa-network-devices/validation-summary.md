# Validation Summary: How to Use Ansible to Configure AAA on Network Devices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Cisco IOS / IOS XE
- Cisco `cisco.ios.ios_config` and `cisco.ios.ios_command` modules
- AAA authentication, authorization, and accounting
- TACACS+
- RADIUS
- 802.1X

## Sources Consulted
- Ansible `cisco.ios.ios_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Ansible `cisco.ios.ios_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- Cisco IOS XE 17.x TACACS configuration guide: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/sec-vpn/b-security-vpn/m_sec-cfg-tacacs-0.html
- Cisco IOS XE Catalyst 9300 17.15 security command reference: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/command_reference/b_1715_9300_cr/security_commands.html
- Cisco IOS XE RADIUS configuration guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/radius/radius-configuration-guide/radius.html
- Cisco IOS Security Command Reference for `username algorithm-type`, `username secret`, and `show aaa method-lists`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/s1/sec-s1-cr-book/sec-cr-t2.html and https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/s1/sec-s1-cr-book/sec-cr-s2.html
- Cisco IOS XE AAA authentication and accounting configuration guides: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_usr_aaa/configuration/xe-16-10/sec-usr-aaa-xe-16-10-book/sec-cfg-authentifcn.html and https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_usr_aaa/configuration/xe-3e/sec-usr-aaa-xe-3e-book/sec-cfg-accountg.html

## Issues Found
- The TACACS accounting example said it logged commands at all privilege levels but only configured privilege levels 0 and 15. Cisco command accounting is configured per privilege level, so I changed the wording to "commonly used privilege levels" and added privilege level 1 accounting.
- The variables described `source_interface` as applying to TACACS and RADIUS, but the RADIUS playbook did not configure a RADIUS source interface. I added `ip radius source-interface {{ aaa_config.source_interface }}` to the RADIUS configuration example.
- The local user section had a comment saying unauthorized users would be removed, but the playbook only reports them. I changed the comment to say the playbook reviews unauthorized accounts before removal.
- The verification task described `show tacacs` as a reachability test. Cisco documents it as displaying TACACS+ statistics, so I renamed the task and comment to reflect what the command actually does.

## Review Notes
- The examples are Cisco IOS / IOS XE oriented and use current `cisco.ios` collection module names.
- Local fallback only applies when the preceding AAA method fails to respond; an explicit reject from a server stops the authentication process. The post's fallback wording is acceptable because it frames fallback around unreachable TACACS/RADIUS servers.
- The examples assume inventory or group variables provide normal network automation settings such as `ansible_network_os: cisco.ios.ios` and privilege escalation where required.

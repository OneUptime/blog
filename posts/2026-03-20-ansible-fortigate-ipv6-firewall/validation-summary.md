# Validation Summary: How to Configure FortiGate IPv6 Firewall Addresses with Ansible

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- Fortinet FortiOS / FortiGate
- IPv6
- Firewall policy automation

## Sources Consulted
- Ansible `fortinet.fortios.fortios_firewall_address6` module docs: https://docs.ansible.com/ansible/latest/collections/fortinet/fortios/fortios_firewall_address6_module.html
- Ansible `fortinet.fortios.fortios_firewall_addrgrp6` module docs: https://docs.ansible.com/ansible/latest/collections/fortinet/fortios/fortios_firewall_addrgrp6_module.html
- Ansible `fortinet.fortios.fortios_firewall_policy6` module docs: https://docs.ansible.com/ansible/latest/collections/fortinet/fortios/fortios_firewall_policy6_module.html
- Ansible `fortinet.fortios.fortios_configuration_fact` module docs: https://docs.ansible.com/projects/ansible/latest/collections/fortinet/fortios/fortios_configuration_fact_module.html
- Ansible `fortinet.fortios.fortios` HTTPAPI plugin docs: https://docs.ansible.com/projects/ansible/latest/collections/fortinet/fortios/fortios_httpapi.html
- Ansible `ansible.netcommon.httpapi` connection plugin docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/httpapi_connection.html
- Fortinet FortiOS CLI reference for `firewall address6`: https://docs.fortinet.com/document/fortigate/6.4.3/cli-reference/251620/firewall-address6
- Fortinet FortiOS collection repository README: https://github.com/fortinet-ansible-dev/ansible-galaxy-fortios-collection
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The inventory example omitted the HTTPAPI connection settings needed for FortiGate REST automation. I added `ansible_connection=ansible.netcommon.httpapi` and the relevant HTTPAPI SSL and port variables.
- The example IPv6 literals `2001:db8:management::/48` and `2001:db8:web::10/128` were invalid because IPv6 hextets must be hexadecimal. I replaced them with valid documentation-prefix examples.
- The `DNS-SERVERS-IPv6` example used a broad prefix that did not match its comment. I replaced it with a valid documentation-prefix host address and updated the comment accordingly.
- The Step 3, Step 4, and Step 5 YAML snippets were not runnable playbooks because they only contained `tasks:` blocks. I added complete play headers so the files match the `ansible-playbook` commands shown later in the post.
- The `fortios_firewall_policy6` examples used `srcaddr6` and `dstaddr6`, but the current module uses `srcaddr` and `dstaddr` for IPv6 policy address references. I corrected those fields.
- The verification example used `fortios_firewall_address6_info`, which is not the current facts-gathering approach documented for this collection. I replaced it with `fortios_configuration_fact` using `selector: "firewall_address6"` and fixed the debug output path to `addr_result.results`.
- The run commands skipped `create-ipv6-groups.yml`, which would leave the policy example referencing a missing address group. I added the missing playbook invocation.
- The prerequisites did not mention the current collection requirement of Ansible 2.15 or newer. I added that requirement note.

## Review Notes
- The post now aligns with the current Fortinet collection docs and Ansible HTTPAPI connection model.
- The collection supports both username/password and access-token authentication; the post’s username/password approach is still valid, though the collection README recommends access tokens for stronger security.

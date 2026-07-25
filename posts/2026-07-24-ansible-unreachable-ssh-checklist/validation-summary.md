# Validation Summary: SSH Works Manually, but Ansible Says UNREACHABLE: A Troubleshooting Checklist

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Ansible inventories, ad hoc commands, connection variables, variable precedence, and error handling
- Ansible SSH, raw, ping, command, wait_for_connection, and meta plugins
- OpenSSH client configuration, authentication, host-key verification, jump hosts, and connection multiplexing
- SSH privilege escalation with Ansible become
- DNS, IPv4/IPv6 resolution, and TCP port diagnostics
- AWX, CI, containers, and dynamic inventory execution environments

## Sources Consulted

- [Ansible: Connection methods and details](https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html)
- [Ansible: How to build your inventory](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html)
- [Ansible: Controlling how Ansible behaves—precedence rules](https://docs.ansible.com/projects/ansible/latest/reference_appendices/general_precedence.html)
- [Ansible CLI documentation](https://docs.ansible.com/projects/ansible/latest/cli/ansible.html)
- [ansible-inventory CLI documentation](https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html)
- [ansible-playbook CLI documentation](https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html)
- [ansible.builtin.ssh connection plugin](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html)
- [ansible.builtin.ping module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html)
- [ansible.builtin.raw module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html)
- [ansible.builtin.wait_for_connection module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html)
- [Ansible: Error handling in playbooks](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html)
- [Ansible: Understanding privilege escalation—become](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html)
- [OpenBSD ssh(1) manual](https://man.openbsd.org/ssh.1)
- [OpenBSD ssh_config(5) manual](https://man.openbsd.org/ssh_config.5)
- [OpenBSD ssh-keygen(1) manual](https://man.openbsd.org/ssh-keygen.1)
- [OpenBSD nc(1) manual](https://man.openbsd.org/nc.1)
- [Linux getent(1) manual](https://man7.org/linux/man-pages/man1/getent.1.html)
- [RFC 5737: IPv4 Address Blocks Reserved for Documentation](https://www.rfc-editor.org/rfc/rfc5737.html)

## Issues Found

- The post originally implied that the `-u` and `--private-key` command-line options could override connection variables from inventory and used those options to force a diagnostic identity. Ansible variables have higher precedence than ordinary command-line options, so conflicting inventory variables would still win. The explanation now states the precedence rule, and the diagnostic command uses `-e` extra variables to force the user and key for that run.
- The OpenSSH `Host web-prod-*` example did not match either the `web-01` inventory alias or the `192.0.2.41` destination passed to SSH through `ansible_host`. OpenSSH applies a `Host` stanza to the hostname or address passed on the SSH command line. The pattern now includes both `web-01` and `192.0.2.41`, and the surrounding explanation calls out this requirement.
- The no-multiplexing SSH diagnostic was described as equivalent but omitted the configured port and private key, so it could test a different authentication path. The example now retains the address, user, port, key, and verbosity while changing only `ControlMaster` and `ControlPath`.

## Review Notes

- The Ansible examples use current fully qualified collection names and supported CLI options. No deprecated Ansible APIs or version-specific claims were found.
- `ansible.builtin.ping`, `ansible.builtin.raw`, host-key checking, `ansible_ssh_common_args`, ControlPersist, become, `ignore_unreachable`, and `meta: clear_host_errors` behave as described in current Ansible documentation.
- `getent ahosts` is specific to systems that provide the GNU C Library utility, and `nc` option sets can vary by implementation. The shown commands are valid for the documented implementations but may need platform-specific substitutes on some controllers.
- The example address `192.0.2.41` is correctly drawn from the TEST-NET-1 block reserved for documentation.

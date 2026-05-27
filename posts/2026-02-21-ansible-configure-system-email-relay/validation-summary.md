# Validation Summary: How to Use Ansible to Configure System Email Relay

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- ansible.posix.firewalld
- Postfix SMTP relay configuration
- SMTP authentication and TLS
- Linux mail queue monitoring

## Sources Consulted
- Postfix Configuration Parameters: https://www.postfix.org/postconf.5.html
- Postfix postmap(1): https://www.postfix.org/postmap.1.html
- Postfix regexp_table(5): https://www.postfix.org/regexp_table.5.html
- Postfix SASL Howto: https://www.postfix.org/SASL_README.html
- Postfix Standard Configuration Examples: https://www.postfix.org/STANDARD_CONFIGURATION_README.html
- Postfix Address Rewriting: https://www.postfix.org/ADDRESS_REWRITING_README.html
- Ansible built-in collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- ansible.builtin.lineinfile documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/lineinfile_module.html
- ansible.builtin.systemd/systemd_service documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- ansible.posix.firewalld documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html

## Issues Found
- The relay server playbook attempted to run `postmap regexp:/etc/postfix/sender_canonical`. Postfix regexp maps are read directly and can be queried with `postmap -q`, but `postmap` only creates indexed database files for supported writable map types such as `hash`, `btree`, `cdb`, `dbm`, and `lmdb`. I changed the sender canonical map task to restart Postfix instead and removed the invalid handler.
- The failover example used `fallback_relay`. Postfix documents this as the pre-2.3 name; current Postfix uses `smtp_fallback_relay`. I updated the failover snippet and the production recommendation text.
- The test playbook interpolated `ansible_host` directly, which fails for inventories that do not define that variable. I changed it to fall back to `ansible_default_ipv4.address` and then `inventory_hostname`.

## Review Notes
- The examples are Red Hat-family focused because package installation uses `ansible.builtin.yum` and the relay template uses the Red Hat CA bundle path. That is technically valid for the shown conditionals, but a future cross-distribution version should add Debian/Ubuntu package names and CA bundle paths.
- `ansible.builtin.systemd` remains a backward-compatible alias for `ansible.builtin.systemd_service`; using the newer name would be a modernization rather than a correctness fix.

# Validation Summary: How to Use Ansible to Configure SNMP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Net-SNMP/snmpd
- SNMPv2c and SNMPv3
- Linux package management with APT and Ansible's generic package module
- firewalld
- SNMP traps and Net-SNMP extend scripts

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.package` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible `ansible.builtin.service_facts` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Net-SNMP `snmpd.conf` manual page: https://net-snmp.sourceforge.io/docs/man/snmpd.conf.html
- Debian `net-snmp-create-v3-user(1)` manual page: https://manpages.debian.org/unstable/snmpd/net-snmp-create-v3-user.1.en.html
- RFC 3414, User-based Security Model for SNMPv3: https://www.rfc-editor.org/rfc/rfc3414

## Issues Found
- The RHEL/CentOS package installation example used `ansible.builtin.yum`. Current Ansible documentation notes that generic package tasks can use `ansible.builtin.package` to select the operating system package backend automatically. Changed the example to `ansible.builtin.package` to avoid pinning the snippet to the older `yum` module.
- The SNMPv3 playbook mixed `snmpusm` user creation with `net-snmp-create-v3-user`, assumed an `initial` SNMPv3 user that was never configured, ignored command failures, and deleted a distro-specific persistent SNMP user file. Removed those incorrect steps, kept the documented Net-SNMP helper command, and deployed the template after user creation so the stricter `rouser ... priv` line remains authoritative.
- The trap example said it would send a trap when disk usage was over the threshold, but the monitor expression used `dskPercent < 90`. Changed it to `dskPercent > 90`.

## Review Notes
- The examples are technically valid as tutorial snippets, but production roles should add idempotency around `net-snmp-create-v3-user`, keep SNMP credentials in Ansible Vault, and handle distro-specific package availability such as `snmp-mibs-downloader`.

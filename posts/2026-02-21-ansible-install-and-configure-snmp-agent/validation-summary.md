# Validation Summary: How to Use Ansible to Install and Configure SNMP Agent

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and built-in modules
- Net-SNMP snmpd configuration
- SNMPv2c community-based access
- SNMPv3 USM authentication and privacy
- SNMP traps and DisMan Event MIB monitors
- Linux package and service management

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.yum` redirect documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Net-SNMP `snmpd.conf` manual: https://net-snmp.sourceforge.io/docs/man/snmpd.conf.html
- Net-SNMP `snmpcmd` manual: https://net-snmp.sourceforge.io/docs/man/snmpcmd.html
- Debian `net-snmp-create-v3-user` manual page: https://manpages.debian.org/unstable/snmpd/net-snmp-create-v3-user.1.en.html
- RFC 3414, User-based Security Model for SNMPv3: https://www.rfc-editor.org/rfc/rfc3414

## Issues Found
- The v2c template defined `systemview` and `allview` views but did not apply them to the community directives. Updated `rocommunity` and `rwcommunity` to reference the intended views with `-V`.
- The SNMPv3 example defined `allview` but did not attach it to the `rouser` directive. Updated the `rouser` line to use `-V allview`.
- The v2c extension example used `/etc/redhat-release`, which fails on Debian/Ubuntu even though the playbook targets Debian-family systems. Replaced it with `/etc/os-release`.
- The SNMPv3 user existence check only looked at `/var/lib/snmp/snmpd.conf`. Updated it to check both `/var/lib/snmp/snmpd.conf` and `/var/lib/net-snmp/snmpd.conf`, which are common Net-SNMP persistent state paths.
- The trap monitor example used invalid or misleading monitor expressions for disk and process checks. Replaced them with `dskErrorFlag` and `prErrorFlag` expressions consistent with Net-SNMP's documented `defaultMonitors` examples.
- The trap monitor example omitted the internal SNMPv3 query user required by Net-SNMP DisMan Event MIB monitors. Added creation of an internal read-only SNMPv3 user and configured `iquerySecName` plus suitable access.

## Review Notes
- Local Ansible and Net-SNMP binaries were not installed in the review environment, so command execution was verified against official documentation rather than local `ansible-doc`, `snmpd`, or `snmpget` help output.
- The examples use `ansible.builtin.systemd`, which remains available as a redirect/alias in current Ansible documentation, though the canonical module page is now `ansible.builtin.systemd_service`.

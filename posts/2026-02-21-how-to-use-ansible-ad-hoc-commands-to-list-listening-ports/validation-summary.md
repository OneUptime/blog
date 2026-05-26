# Validation Summary: How to Use Ansible Ad Hoc Commands to List Listening Ports

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible ad hoc commands
- ansible.builtin.shell
- ansible.builtin.wait_for
- ansible.builtin.setup
- Linux ss
- Linux netstat
- awk, grep, sort, uniq
- TCP, UDP, and IPv6 socket inspection

## Sources Consulted
- Ansible ad hoc command documentation: https://docs.ansible.com/projects/ansible/latest/command_guide/intro_adhoc.html
- Ansible CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- ansible.builtin.wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- ansible.builtin.setup module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/setup_module.html
- Linux ss help output from iproute2 (`ss --help`)
- Linux netstat manual page: https://man7.org/linux/man-pages/man8/netstat.8.html

## Issues Found
- The post said the `shell` module was used because some systems alias `netstat`. Ansible's shell module runs through `/bin/sh` on the target, and aliases are not a reliable reason to choose it. Updated the explanation to say `shell` is useful when extending commands with pipes or other shell syntax, while `command` is fine for simple commands.
- The `wait_for` examples implied a general listening-port check. The module defaults to checking `127.0.0.1`, so the text now says the command checks each target's localhost and succeeds when the target can connect to that port.
- One command comment claimed to show a full process tree, but the command only prints the local socket address and process field from `ss`. Updated the comment accordingly.
- The CSV report script parsed the wrong column from mixed TCP/UDP `ss -tulnp` output. In that output, the local address is field 5, not field 4, because the protocol appears as the first field. Updated the script to use `ss -H -tulnp`, parse protocol/address/port from the correct fields, and quote the process column for CSV output.

## Review Notes
- Ansible was not installed in the local environment, so Ansible CLI behavior was verified against official Ansible documentation rather than local `ansible --help` output.
- The `ss` and `netstat` flags used by the examples are current and match local help output and authoritative manual documentation.

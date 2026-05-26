# Validation Summary: How to Use the Ansible lineinfile Module with Regex

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.lineinfile
- ansible.builtin.replace
- ansible.builtin.regex_escape
- YAML
- Python regular expressions
- OpenSSH sshd_config
- sudoers validation
- sysctl, Apache, Nginx, MySQL, PostgreSQL, and fstab configuration examples

## Sources Consulted
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible ansible.builtin.replace module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/replace_module.html
- Ansible ansible.builtin.regex_escape filter documentation: https://docs.ansible.com/ansible-core/devel/collections/ansible/builtin/regex_escape_filter.html
- OpenSSH release notes: https://www.openssh.com/releasenotes.html
- OpenBSD sshd_config(5) manual page: https://man.openbsd.org/sshd_config
- Local GNU grep behavior checked with `grep -E`
- YAML examples parsed locally with PyYAML

## Issues Found
- The sysctl loop interpolated `item.key` directly into `regexp`. Sysctl names such as `net.core.somaxconn` contain dots, which are regex metacharacters, so the pattern could match unintended lines. Changed the pattern to use `{{ item.key | regex_escape }}`.
- The SSH hardening loop included `Protocol 2`. OpenSSH 7.6 removed SSH protocol version 1 support and associated configuration options, and current `sshd_config(5)` no longer lists `Protocol` as a supported keyword. Removed that loop item so the example validates on modern OpenSSH.

## Review Notes
- The main `lineinfile` explanation is consistent with the current Ansible documentation: `regexp` uses Python regular expressions, replaces only the last matching line for `state=present`, and uses `insertafter`/`insertbefore` only when `regexp` does not match.
- The `replace` module recommendation for changing all matching occurrences is correct.
- Ansible was not installed in the local environment, so full playbook execution was not run. YAML syntax was parsed locally and module behavior was verified against official documentation.

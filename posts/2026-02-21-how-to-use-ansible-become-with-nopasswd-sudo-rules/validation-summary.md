# Validation Summary: How to Use Ansible become with NOPASSWD sudo Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible privilege escalation with become
- sudo and sudoers NOPASSWD rules
- Linux SSH daemon configuration
- sudo command logging and I/O logging
- Ansible playbooks, templates, copy, lineinfile, and command modules

## Sources Consulted
- Ansible Community Documentation: Understanding privilege escalation / become: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible Community Documentation: Configuration settings / pipelining: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: ansible.builtin.copy module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible Community Documentation: ansible.builtin.template module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible Community Documentation: ansible.builtin.lineinfile module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- sudoers(5) local manual page and visudo validation, sudo 1.9.15p5
- OpenBSD/OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config

## Issues Found
- The restrictive sudoers section implied command-path restrictions are generally appropriate for Ansible. Updated the wording to clarify that this pattern is mainly for direct sudo use and is tricky for normal Ansible module execution because Ansible escalates generated module wrappers or shell invocations.
- The Ansible sudoers template listed `root` in `nopasswd_users`, which caused the generated template to grant `deploy ALL=(root) NOPASSWD: ALL` after the command-specific root rules. Removed `root` from that list so the example does not accidentally override the command restrictions it just defined.
- The description of what sudo sees during Ansible execution was too absolute. Updated it to say Ansible may invoke a generated module through `/bin/sh -c` or `/bin/bash -c`, and that sudo may see either the shell or the temporary module path.
- The target-user restriction section said the deploy account could not become arbitrary users, but unrestricted root sudo remains full host control. Clarified that the restriction only prevents direct `sudo -u otheruser` access for users that are not listed.
- The pipelining section incorrectly attributed the sudo conflict to password prompt interaction. Updated it to match Ansible documentation: pipelining conflicts with privilege escalation when sudo `requiretty` is enabled; NOPASSWD avoids password prompts but does not by itself address `requiretty`.
- The SSH hardening task was named as an IP restriction, but its snippet disables TCP forwarding, X11 forwarding, and tunnels for the deploy user. Renamed the task to accurately describe the configuration.

## Review Notes
Representative sudoers rules were checked with `visudo -cf` using local sudo 1.9.15p5. Ansible was not installed in the local environment, so Ansible module and configuration behavior was verified against current official Ansible documentation.

# Validation Summary: How to Use Ansible for Technical Debt Reduction

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: command, shell, apt, copy, set_fact, stat, service_facts
- ansible-lint
- Ubuntu/Debian package management with apt
- Ubuntu release upgrades with do-release-upgrade
- OpenSSH and OpenSSL/TLS checks
- Molecule testing

## Sources Consulted
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible shell module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible stat module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible service_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible playbook tests documentation for version comparisons: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- ansible-lint fqcn rule documentation: https://docs.ansible.com/projects/lint/rules/fqcn/
- ansible-lint name rule documentation: https://docs.ansible.com/projects/lint/rules/name/
- ansible-lint usage examples and rule IDs: https://docs.ansible.com/projects/lint/usage/
- Ubuntu do-release-upgrade manpage: https://manpages.ubuntu.com/manpages/plucky/en/man8/do-release-upgrade.8.html
- Ubuntu Server release upgrade documentation: https://documentation.ubuntu.com/server/how-to/software/upgrade-your-release/
- OpenSSL s_client documentation: https://docs.openssl.org/master/man1/openssl-s_client/

## Issues Found
- The TLS 1.1 check used `ansible.builtin.command` with shell input redirection (`< /dev/null`). The Ansible command module does not process shell metacharacters, so I changed that task to `ansible.builtin.shell` and added `timeout 5` to avoid a hanging probe.
- The manual configuration change check assumed `/var/log/ansible-last-run` existed. `find -newer` fails when the reference file is missing, so I added an `ansible.builtin.stat` check and made the `find` task conditional.
- The apt package inventory and update checks were written for Debian-family systems but targeted `hosts: all`. I added Debian-family guards and non-fatal handling so the assessment and metrics playbooks do not fail on non-Debian hosts.
- The pending update counters could become negative when apt output was unavailable or empty. I clamped the result to zero and used `default([])` for skipped or failed registered variables.
- The "known vulnerable packages" task only listed installed packages and did not check a vulnerability database. I renamed it to "Capture installed package inventory" to match what the command actually does.
- Two apt task names referred to "security updates" even though the examples count and apply general available package updates. I renamed those tasks to avoid overstating what `apt list --upgradable` and `upgrade: safe` do.
- The OS upgrade prep snippet saved `services`, but `ansible.builtin.service_facts` exposes service data under `ansible_facts.services`. I updated the copy task accordingly.
- The debt metrics playbook used stderr redirection (`2>/dev/null`) with `ansible.builtin.command`. I removed the shell redirection and made the command non-fatal.

## Review Notes
- The examples are Ubuntu/Debian-oriented even though some playbooks target `all`; the added guards keep them from failing elsewhere, but a production version should separate Debian, Red Hat, and other platform logic.
- The TLS probe is a lightweight signal, not a complete TLS policy audit. A production audit should test the real service endpoints and supported protocol/cipher matrix.
- The package version pins are examples and must match versions available in the target hosts' configured apt repositories.

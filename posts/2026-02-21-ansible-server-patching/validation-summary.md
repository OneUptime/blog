# Validation Summary: How to Use Ansible to Automate Server Patching

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible apt, reboot, uri, command, lineinfile, service, assert, copy, stat, and include_tasks modules
- Ansible rolling updates with serial and max_fail_percentage
- Debian/Ubuntu apt package patching
- systemd and systemctl
- OpenSSH server configuration
- OpenSSL certificate checks
- Linux firewall, port, audit, and password aging checks

## Sources Consulted
- Ansible apt module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible reboot module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html
- Ansible command module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible uri module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible lineinfile module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible service module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible assert module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible check mode docs: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible error handling and max_fail_percentage docs: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_error_handling.html
- OpenSSL x509 command docs: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSH sshd_config manual: https://man7.org/linux/man-pages/man5/sshd_config.5.html
- systemctl manual: https://man7.org/linux/man-pages/man1/systemctl.1.html

## Issues Found
- The description claimed the role used pre-patch snapshots, but the post only implemented pre-patch checks. Changed the description to say "pre-patch checks."
- The defaults included `patching_exclude_packages`, but no task used it and the shown apt workflow did not implement package exclusion. Removed the unused default to avoid implying unsupported behavior.
- The reboot task set `pre_reboot_delay: 5`. On Linux, Ansible's reboot module passes this to the shutdown command in minutes and rounds values below 60 seconds down to 0. Changed it to `60` so the delay is effective.
- The dry-run comment said it would show what would be updated, but the playbook includes command tasks that are skipped in check mode unless special check-mode conditions are provided. Reworded the comment to "Dry run supported tasks before applying updates."
- The TLS certificate check used `openssl x509 -dates`, which prints certificate dates but does not fail for an expired certificate. Changed it to `openssl x509 -checkend 0` so the task fails when the certificate is already expired.
- The prohibited-port assertion searched for raw substrings like `23`, which could match unrelated text in `ss` output. Changed the assertion to search for port-shaped matches like `:23` followed by whitespace.
- The SSH restart handler used the `sshd` service name, which is not correct on Debian-family systems where the service is commonly `ssh`. Changed it to choose `ssh` on Debian-family hosts and `sshd` elsewhere.

## Review Notes
The Ansible examples are syntactically valid YAML after the corrections. Future improvements could use fully qualified Ansible module names consistently in the patching role, add explicit package-hold logic if package exclusion is desired, and split the unrelated compliance examples into a separate article for clarity.

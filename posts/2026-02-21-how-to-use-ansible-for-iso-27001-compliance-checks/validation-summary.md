# Validation Summary: How to Use Ansible for ISO 27001 Compliance Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- ISO 27001 compliance automation concepts
- OpenSSH server configuration validation
- Linux password quality, faillock, auditd, cron, UFW, and socket inspection
- LUKS volume checks
- OpenSSL certificate checks
- GitHub Actions scheduled workflows

## Sources Consulted
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.assert` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible `ansible.builtin.service_facts` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- OpenSSH `sshd(8)` manual page: https://man7.org/linux/man-pages/man8/sshd.8.html
- Linux `lsblk(8)` manual page: https://man7.org/linux/man-pages/man8/lsblk.8.html
- Linux `ss(8)` manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- Linux `faillock(8)` and `pam_faillock(8)` manual pages: https://man7.org/linux/man-pages/man8/faillock.8.html and https://man7.org/linux/man-pages/man8/pam_faillock.8.html
- OpenSSL `x509` command documentation: https://docs.openssl.org/1.1.1/man1/x509/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- Password, SSH, faillock, and login aging `lineinfile` examples only matched uncommented directives at the start of a line. Updated the regular expressions so they also replace common commented defaults and whitespace-separated settings, which keeps the tasks idempotent and avoids duplicate conflicting directives.
- The auditd validation accessed `ansible_facts.services['auditd.service']` directly. Updated it to use `.get()` so the assertion reports a failed control instead of erroring if the service fact is absent.
- The GitHub Actions example ran the validation playbook with `--check`. Ansible command tasks without `creates` or `removes` are skipped in check mode, so the registered validation data would not be produced. Updated the workflow to install Ansible and run the read-only validation playbook normally with an inventory.
- The LUKS example collected `lsblk -f` output but did not validate that any encrypted volume was present. Added an assertion for `crypto_LUKS` in the block device output.
- The TLS certificate example used `openssl x509 -dates`, then treated a successful parse as proof that the certificate was not expired. Updated it to use `openssl x509 -checkend 0`, which checks whether the certificate is still valid at the current time.
- The listening-port example used `ss -tlnp`, which only checks TCP sockets while the prohibited list included UDP port 69. Updated it to `ss -tulnp` and changed the assertion from substring matching to a port-pattern check to avoid false matches such as `23` matching `1234`.

## Review Notes
The examples are Linux-focused and assume distributions that use paths such as `/etc/security/pwquality.conf`, `/etc/security/faillock.conf`, `/etc/audit/rules.d`, and the `auditd` service name. In production, the role should branch by OS family and service manager, and map each task to the specific ISO 27001:2022 Annex A control or organization-specific control objective being evidenced.

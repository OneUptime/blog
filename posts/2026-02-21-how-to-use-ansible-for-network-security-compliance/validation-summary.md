# Validation Summary: How to Use Ansible for Network Security Compliance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and built-in modules
- OpenSSH server configuration
- Linux password policy configuration with libpwquality and faillock
- Linux auditd rules
- UFW firewall status checks
- Linux socket inspection with ss
- OpenSSL X.509 certificate checks
- GitHub Actions scheduled workflows

## Sources Consulted
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.assert` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible `ansible.builtin.service_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible installation documentation: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- OpenSSL `openssl-x509` documentation: https://docs.openssl.org/3.4/man1/openssl-x509/
- Linux `ss(8)` manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- Linux `audit.rules(7)` manual page: https://man7.org/linux/man-pages/man7/audit.rules.7.html
- Debian `pwquality.conf(5)` manual page: https://manpages.debian.org/stretch/libpwquality-common/pwquality.conf.5.en.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The access control role disabled SSH root login but the validation playbook also asserted `PasswordAuthentication no`. Added an SSH password authentication task so the enforcement example matches the validation example.
- The LUKS encryption example collected `lsblk -f` output but did not validate that any LUKS volume was present. Added an assertion for `crypto_LUKS` in the block device output.
- The TLS certificate check used `openssl x509 -dates`, which prints certificate validity dates but does not fail for an expired certificate. Replaced it with `openssl x509 -checkend 0`, which exits nonzero when the certificate is expired.
- The unauthorized port check searched for bare port-number substrings in all `ss` output, which could match unrelated ports such as `12345` when checking `23`. Replaced it with per-port `ss` filters and assertions against each filtered result.

## Review Notes
- The examples are Linux-focused and assume services and paths such as `sshd`, `auditd.service`, `/etc/security/pwquality.conf`, `/etc/security/faillock.conf`, and `ufw`, which vary by distribution and environment.
- The GitHub Actions snippet is syntactically valid, but a real workflow may need an Ansible installation step and a reachable inventory depending on the runner image and target environment.

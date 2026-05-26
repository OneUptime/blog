# Validation Summary: How to Use Ansible for Security Baseline Enforcement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, roles, handlers, facts, assertions, and modules
- OpenSSH server configuration and `sshd -T`
- Linux password policy files: `pwquality.conf`, `faillock.conf`, and `login.defs`
- OpenSSL X.509 certificate checks
- Linux firewall and socket inspection commands: `ufw` and `ss`
- Linux auditd and audit rule files
- cron scheduling
- GitHub Actions workflow YAML

## Sources Consulted
- Ansible `lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible `service_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible `cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- OpenSSL `x509` documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSH `sshd_config` manual: https://man.openbsd.org/sshd_config
- Debian `pwquality.conf` manual: https://manpages.debian.org/bookworm/libpwquality-common/pwquality.conf.5.en.html
- Linux `ss` manual from iproute2: https://manpages.opensuse.org/Tumbleweed/iproute2/ss.8.en.html

## Issues Found
- The GitHub Actions example ran `ansible-playbook ... --check` against a validation playbook containing `ansible.builtin.command` tasks. Ansible documents command check mode as partial and skips arbitrary commands without `creates` or `removes`, so the registered variables could be unavailable. Removed `--check`; the validation playbook already uses read-only commands and `changed_when: false`.
- The TLS certificate example used `openssl x509 -dates`, which only prints validity dates and does not fail for an expired certificate. Changed it to `openssl x509 -checkend 0`, which exits nonzero when the certificate has expired.
- The prohibited-port assertion checked whether strings such as `"23"` appeared anywhere in `ss` output, which can match unrelated ports or process text. Changed it to query each prohibited listening port directly with `ss -H -ltn sport = :<port>` and assert empty output.
- Several `lineinfile` examples only matched uncommented directives, so common commented defaults such as `#PermitRootLogin` or `# PASS_MAX_DAYS` would not be replaced. Updated those regular expressions to match optional leading comments and whitespace.
- The report-generation example recorded password-complexity success but not failure. Added a failure record so the reported failed count and score reflect that check.

## Review Notes
- Ansible was not installed in the local workspace, so local `ansible-playbook` syntax execution was not possible. The examples were reviewed against official Ansible documentation and relevant command manuals instead.
- The examples remain Linux-distribution dependent, especially service names such as `auditd.service`, the OpenSSH service name `sshd`, and file paths for PAM, auditd, and UFW. That is acceptable for a hardening guide, but production roles should parameterize these values by OS family.

# Validation Summary: How to Use Ansible to Enforce Password Complexity Policies

## Status
validated

## Post Type
Tutorial / compliance automation guide

## Technologies Covered
- Ansible playbooks and built-in modules
- PAM password quality and account lockout configuration
- OpenSSH server configuration
- auditd
- OpenSSL X.509 certificate checks
- Linux networking and firewall validation with ufw and ss
- GitHub Actions scheduled workflows
- cron

## Sources Consulted
- Ansible documentation: ansible.builtin.lineinfile - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible documentation: ansible.builtin.command and check mode behavior - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation: ansible.builtin.service_facts - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible documentation: ansible.builtin.assert - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible documentation: ansible.builtin.cron - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- GitHub Actions workflow syntax - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- libpwquality pwquality.conf manual - https://manpages.debian.org/stretch/libpwquality-common/pwquality.conf.5.en.html
- Linux-PAM faillock.conf manual - https://man7.org/linux/man-pages/man5/faillock.conf.5.html
- Linux-PAM pam_faillock manual - https://man7.org/linux/man-pages/man8/pam_faillock.8.html
- OpenSSH sshd_config manual - https://man7.org/linux/man-pages/man5/sshd_config.5.html
- OpenSSL x509 documentation - https://docs.openssl.org/3.3/man1/openssl-x509/
- iproute2 ss manual - https://manpages.debian.org/bookworm/iproute2/ss.8.en.html

## Issues Found
- The GitHub Actions example used `ansible-playbook ... --check` for a validation playbook that relies on `ansible.builtin.command` output. Ansible command tasks without `creates` or `removes` are skipped in check mode, so the registered output could be missing. Removed `--check` and added an Ansible installation step.
- The TLS certificate validation example used `openssl x509 -dates`, which prints validity dates but does not fail when the certificate is expired. Changed it to `openssl x509 -checkend 0` and updated the registered variable used by the assertion.
- The unauthorized port validation checked whether strings such as `"23"` appeared anywhere in `ss` output, which could produce false positives from unrelated addresses, PIDs, or ports. Changed it to query each prohibited listening TCP port with `ss -tlnH "sport = :PORT"` and assert that the filtered result is empty.
- The report generation password complexity check only verified that a `minlen` line existed, not that it was set to the policy value shown earlier. Changed the grep expression to require `minlen = 14` with optional whitespace.
- The SSH remediation snippet set `ClientAliveCountMax 0`; OpenSSH documents that zero disables connection termination. Changed it to `ClientAliveCountMax 3` so it works with `ClientAliveInterval 300` as an idle-session timeout.
- The auditd validation directly indexed `ansible_facts.services['auditd.service']`. Added an explicit defined check so missing auditd service facts fail as a validation result instead of an undefined-variable error.

## Review Notes
The examples remain Linux-distribution dependent. In particular, password quality and faillock settings require the relevant PAM modules to be installed and included in the system PAM stack; `pwquality.conf` and `faillock.conf` are configuration files read by those modules, not standalone enforcement mechanisms.

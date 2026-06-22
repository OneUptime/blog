# Validation Summary: How to Implement Security Hardening with Ansible

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Ansible playbooks and roles
- OpenSSH server configuration
- Linux user, sudoers, PAM, and file permissions
- Linux sysctl kernel parameters
- firewalld and iptables firewall configuration
- Linux auditd audit rules
- CIS-style compliance checks

## Sources Consulted
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible firewalld module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible file lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_lookup.html
- Ansible lookup plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible slurp module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible shell and command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html and https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible service_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- OpenSSH sshd_config manual: https://man.openbsd.org/sshd_config and https://man7.org/linux/man-pages/man5/sshd_config.5.html
- OpenSSH release notes: https://www.openssh.com/releasenotes.html
- GNU findutils operator documentation: https://www.gnu.org/software/findutils/manual/html_node/find_html/Combining-Primaries-With-Operators.html
- Red Hat firewalld zone documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/security_guide/sec-working_with_zones
- Linux audit userspace/manual references: https://man7.org/linux/man-pages/ and https://github.com/linux-audit/audit-userspace

## Issues Found
- Removed the obsolete `Protocol 2` OpenSSH directive. Current OpenSSH supports SSH protocol 2 only, and protocol-version configuration was removed with SSH protocol 1 support.
- Replaced `ChallengeResponseAuthentication no` with `KbdInteractiveAuthentication no`, the current OpenSSH directive used by modern distributions.
- Added default filters to SSH template variables such as `allow_root_ssh_keys`, `allow_password_auth`, `allow_tcp_forwarding`, and `allow_agent_forwarding` so the template does not fail when optional variables are omitted.
- Removed `Defaults requiretty` from the sudoers example because it conflicts with non-interactive automation workflows such as Ansible privilege escalation.
- Changed the kernel-module hardening task from a missing `disable-modules.conf.j2` template reference to an inline managed `copy` task that writes blacklist and install rules from `disabled_kernel_modules`.
- Made firewalld and iptables loops safe when their variable lists are undefined, and made the firewalld default-zone command idempotent by checking the current default zone first.
- Changed the example firewalld default zone from `drop` to `public` because the sample opens SSH, HTTP, and HTTPS in `public`; using `drop` as the default while opening services in `public` would not apply those public-zone service rules to default-zone traffic.
- Added creation of `/etc/iptables` before writing `/etc/iptables/rules.v4`.
- Removed the `audispd-plugins` package from the generic auditd installation task because the post is not distribution-specific and the package name is not portable.
- Fixed the compliance scan's SSH check to use `slurp` instead of `lookup('file')`; Ansible file lookups read from the controller, not the managed host.
- Added `become: yes` to the compliance scan so filesystem and service checks run with the privileges normally required for system compliance scanning.
- Added tags to prerequisite compliance tasks so tagged runs such as `--tags ssh`, `--tags password`, or `--tags audit` still register the variables consumed by later assertions.
- Fixed the unowned-files `find` command by grouping `-nouser -o -nogroup` with escaped parentheses. GNU find gives `-a` higher precedence than `-o`, so the original command did not apply `-xdev` consistently to both branches.
- Made the password-expiration check tolerate a missing `PASS_MAX_DAYS` line at the shell step and fail explicitly in the assertion instead of passing an empty value as zero.

## Review Notes
- The corrected SSH configuration was syntax-checked locally with `sshd -t` using temporary generated host keys.
- Ansible CLI tools were not installed in the local environment, so Ansible module behavior was verified against official Ansible documentation rather than by executing the playbooks.
- The audit rules are syntactically plausible, but audit paths and package names still vary by distribution. A production role should include distribution-specific variables and tests.

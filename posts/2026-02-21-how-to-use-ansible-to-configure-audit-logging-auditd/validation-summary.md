# Validation Summary: How to Use Ansible to Configure Audit Logging (auditd)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Linux auditd
- auditd.conf
- audit rules and augenrules
- ausearch and aureport
- PCI DSS-oriented audit rules

## Sources Consulted
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.yum module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/yum_module.html
- Ansible ansible.builtin.service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- auditd.conf(5) Linux manual page: https://man7.org/linux/man-pages/man5/auditd.conf.5.html
- auditctl(8) Linux manual page: https://man7.org/linux/man-pages/man8/auditctl.8.html
- audit.rules(7) Linux manual page: https://man7.org/linux/man-pages/man7/audit.rules.7.html
- ausearch(8) Linux manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html
- aureport(8) Linux manual page: https://man7.org/linux/man-pages/man8/aureport.8.html
- Red Hat Enterprise Linux 9 Security Hardening audit documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening

## Issues Found
- The post said auditd tracks "network connections" directly. I changed this to "Network-related configuration and hostname changes" because the examples audit network configuration files and hostname/domain syscalls, not all connection events.
- The architecture diagram showed auditd sending to "Remote Syslog". I changed this to "Remote Audit Server / SIEM" to avoid implying syslog forwarding is the native auditd path.
- The RHEL/CentOS install example used `ansible.builtin.yum`. Current Ansible documentation identifies this as a redirect to `ansible.builtin.dnf`, so I changed the task to `ansible.builtin.package` for a more portable package-manager abstraction.
- The boot task was labeled as making auditd start early in boot, but `systemctl enable auditd` only enables startup through systemd. I changed it to verify that auditd is enabled at boot.
- The `auditd.conf` example used older dispatcher settings and the deprecated `enable_krb5` key. I replaced those with current auditd settings: `q_depth`, `overflow_action`, and `transport = TCP`.
- The audit rule examples omitted 32-bit syscall coverage for several syscall rules on bi-arch systems. I added matching `arch=b32` rules where appropriate.
- The kernel module and file deletion examples missed current relevant syscalls such as `finit_module`, `renameat2`, and `rmdir`. I added them to the corresponding rules.
- The rule examples used audit watch shorthand (`-w`), which remains supported but is documented as deprecated by `auditctl(8)`. I converted the watch examples to syscall-form `path` and `dir` rules with explicit `arch=b64` and `arch=b32` coverage.
- The rule set includes common paths from both Debian-style and Red Hat-style systems. I added a warning that nonexistent paths should be removed or templated conditionally before loading the rules.
- The query playbook registered `audit_results` but only printed the summary. I added a debug task to display the matching `ausearch` events.

## Review Notes
None.

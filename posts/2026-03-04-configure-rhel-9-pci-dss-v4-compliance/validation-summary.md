# Validation Summary: How to Configure RHEL for PCI-DSS v4.0 Compliance

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- PCI DSS v4.0.1
- OpenSCAP and SCAP Security Guide
- firewalld
- Linux sysctl hardening
- LUKS disk encryption
- ClamAV
- sudoers
- libpwquality and pam_faillock
- OpenSSH server hardening
- auditd and augenrules
- chrony
- AIDE

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening: OpenSCAP compliance scanning and supported SSG profiles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Red Hat Enterprise Linux 9 Security hardening: Linux Audit, auditd startup, audit log configuration, augenrules, and RHEL 9 audit plugin path: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- Red Hat Enterprise Linux 9 Configuring authentication and authorization: authselect and with-faillock: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters: firewalld zones and persistent configuration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld firewall-cmd manual page: --set-log-denied behavior: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- PCI Security Standards Council Document Library: current PCI DSS v4.0.1 standard and v4.0 to v4.0.1 change documents: https://www.pcisecuritystandards.org/document_library/
- Local RHEL-compatible man pages: pwquality.conf(5), faillock.conf(5), sshd_config(5)

## Issues Found
- The post referred to PCI DSS v4.0 as the target baseline, but the current PCI SSC and RHEL 9 OpenSCAP profile baseline is PCI DSS v4.0.1. Updated the title, description, diagrams, comments, and closing language to v4.0.1 while preserving the explanation that v4.0 introduced the major changes.
- The OpenSCAP scan wrote results under `/var/log/compliance` without creating that directory. Added `mkdir -p /var/log/compliance` before the scan examples.
- The firewalld denied-packet logging command used `--permanent --set-log-denied=all`, but firewalld documents `--set-log-denied` as a runtime and permanent change that reloads the firewall. Removed the unnecessary `--permanent` and reload.
- The networking section stated that PCI DSS requires servers not to route traffic. That was too broad because routing can be valid for scoped network security systems. Reworded it to disabling routing on servers that are not intended to route traffic.
- The file permission example applied `chmod 600` to a directory, which would remove directory traversal, and the ownership example only changed the top-level path. Changed it to set ownership recursively, directory permissions to `700`, and file permissions to `600`.
- The ClamAV example assumed the package is always available in configured RHEL repositories and wrote logs to a possibly missing directory. Added a note to enable an approved repository such as EPEL if needed and added `mkdir -p /var/log/clamav`.
- The account lockout section wrote `faillock.conf` but did not ensure pam_faillock was enabled in the active authselect profile. Added `authselect enable-feature with-faillock` guarded by `authselect current`, followed by `authselect apply-changes`.
- The auditd start command used `systemctl enable --now auditd`; Red Hat documents enabling auditd with systemctl but starting and controlling it with `service auditd`. Updated the commands accordingly.
- The audit rules watched `/etc/audisp/`, but in RHEL 9 audisp functionality is integrated into auditd and plugin configuration lives in `/etc/audit/plugins.d/`. Updated the watched path.
- The audit rule example assumed `/var/lib/pci-data` exists. Added `mkdir -p /var/lib/pci-data` before loading rules.
- The audit retention commands implied `num_logs = 99` with rotation guarantees 12 months of logs. That is not generally true and Red Hat recommends `keep_logs` for strict policies to prevent overwriting. Updated the example to size storage according to event volume, set `max_log_file`, use `max_log_file_action = keep_logs`, and reload auditd.

## Review Notes
The post remains a high-level hardening guide, not a complete PCI DSS compliance program. The OpenSCAP profile is useful evidence, but an assessor will still expect documented scope, targeted risk analyses where applicable, centralized log retention, vulnerability management, MFA, change control, and compensating-control evidence outside these host-level snippets.

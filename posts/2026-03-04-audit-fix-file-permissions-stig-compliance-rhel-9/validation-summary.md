# Validation Summary: How to Audit and Fix File Permissions for STIG Compliance on RHEL

## Status
validated

## Post Type
Tutorial / compliance hardening guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DISA STIG
- OpenSCAP and SCAP Security Guide
- Linux file permissions and ownership
- RPM package verification
- SSH server host key permissions
- Cron configuration permissions

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- OpenSCAP manual: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc
- DISA STIG Library via STIG Viewer, RHEL 9 STIG version history: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/versions
- DISA STIG Library via STIG Viewer, RHEL-09-232040 cron permissions: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2026-02-05/finding/V-257888
- DISA STIG Library via STIG Viewer, RHEL-09-255115 SSH server config permissions: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2026-02-05/finding/V-257999
- DISA STIG Library via STIG Viewer, RHEL-09-255120 SSH private host key permissions: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2026-02-05/finding/V-258000
- DISA STIG Library via STIG Viewer, RHEL-09-255125 SSH public host key permissions: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2026-02-05/finding/V-258001
- DISA STIG Library via STIG Viewer, RHEL-09-232050 home directory permissions: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2025-05-14/finding/V-257890
- GNU findutils help output for `find -xdev`, `-nouser`, `-nogroup`, and `-perm` syntax.

## Issues Found
- The OpenSCAP command was described as a scan "focused on file permissions", but the command runs the full selected STIG profile. Changed the comment to "Run a STIG scan".
- The cron remediation commands used explicit modes such as `0700` for cron directories and `0600` for `/etc/crontab`. Current RHEL 9 STIG V2R8 checks package-owned cron paths against operating system defaults with `rpm --verify cronie crontabs`, and restores them with `dnf reinstall`, `rpm --setugids`, and `rpm --setperms`. Updated the cron section and remediation script accordingly.
- The SSH server configuration example directly set `/etc/ssh/sshd_config` mode and ownership. Current RHEL 9 STIG V2R8 checks OpenSSH server configuration file permissions against the `openssh-server` package and restores them with `rpm --setugids` and `rpm --setperms`. Updated the SSH section and remediation script accordingly.
- The SSH host key examples changed key permissions but did not restart `sshd`, while the STIG fix text includes restarting the service after host key permission changes. Added `systemctl restart sshd.service`.
- The RPM verification section said to fix permission changes by reinstalling the affected package. Updated it to recommend `rpm --setperms` and `rpm --setugids` for packaged permission and ownership drift, with reinstall reserved for missing or damaged files.

## Review Notes
The post is technically relevant and contains executable administrative commands. The OpenSCAP command syntax matches Red Hat and OpenSCAP documentation, but the local review environment did not have `oscap` or `rpm` installed, so those commands were verified against official documentation rather than local execution.

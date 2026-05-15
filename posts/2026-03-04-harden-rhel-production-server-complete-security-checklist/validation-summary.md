# Validation Summary: How to Harden a RHEL Production Server with a Complete Security Checklist

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- DNF and dnf-automatic
- SELinux
- OpenSSH server configuration
- firewalld
- Linux Audit daemon and augenrules
- Linux password policy configuration
- systemd services
- Linux file permissions

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing security updates, including `dnf update --security` and `dnf-automatic` `upgrade_type = security`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_and_monitoring_security_updates/installing-security-updates_managing-and-monitoring-security-updates
- Red Hat Enterprise Linux 9 documentation: Changing SELinux states and modes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/changing-selinux-states-and-modes_using-selinux
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Enterprise Linux 9 documentation: Auditing the system and using `augenrules`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- Red Hat Enterprise Linux 9 documentation: PAM authentication example with `pam_pwquality`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/restricting-domains-for-pam-services-using-sssd_configuring-authentication-and-authorization-in-rhel
- `login.defs(5)` manual page on the review system
- `sshd_config(5)` manual page on the review system

## Issues Found
- The update command used `dnf update -y` under a section titled "Apply All Security Updates". Red Hat documents `dnf update --security` for installing all available security updates, so the command was changed to `sudo dnf update --security -y`.
- The automatic update snippet changed `apply_updates`, but did not ensure only security updates were installed. Red Hat documents setting `upgrade_type = security` in `/etc/dnf/automatic.conf`, so the `sed` command was changed accordingly.
- The SELinux persistence command only replaced `SELINUX=permissive`. It would not correct other existing values such as `SELINUX=disabled`, so it was changed to replace the whole `SELINUX=` line with `SELINUX=enforcing`.
- The SSH hardening drop-in used `99-hardening.conf`. OpenSSH applies the first value it obtains for most global keywords, so a later file may not override earlier drop-ins. The file was changed to `01-hardening.conf`.
- The SSH snippet disabled `PasswordAuthentication` but did not explicitly disable keyboard-interactive authentication. `KbdInteractiveAuthentication no` was added.
- The SSH snippet included `Protocol 2`, which is obsolete for current OpenSSH/RHEL hardening guidance because modern OpenSSH uses SSH protocol 2. The line was removed.
- The SSH snippet restarted `sshd` without validating the configuration. `sudo sshd -t` was added before restart.
- The auditd snippet used `systemctl enable --now auditd`. Red Hat's audit documentation uses `systemctl enable auditd` and the `service auditd start` control path, so the commands were adjusted.
- The password policy snippet set `PASS_MIN_LEN` in `/etc/login.defs`. The local `login.defs(5)` manual no longer lists `PASS_MIN_LEN`, and RHEL password quality checks are handled through `pam_pwquality` and `/etc/security/pwquality.conf`, so the command was changed to set `minlen = 12` in `pwquality.conf`.

## Review Notes
The `PASS_MAX_DAYS` and `PASS_MIN_DAYS` values in `/etc/login.defs` apply when accounts are created and do not automatically update existing users. A future revision could mention using `chage` for existing local accounts, but the existing commands are syntactically valid and consistent with the section's narrow checklist style.

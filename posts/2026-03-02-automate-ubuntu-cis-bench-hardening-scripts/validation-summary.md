# Validation Summary: How to Automate Ubuntu CIS Bench Hardening with Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu 22.04 LTS
- CIS Ubuntu Benchmark hardening
- Bash scripting
- systemd and systemctl
- Linux kernel module configuration with modprobe.d
- sysctl network hardening
- Linux auditd and audit rules
- PAM password quality and pam_faillock
- OpenSSH server configuration
- Ansible copy, command, and fetch tasks

## Sources Consulted
- Ubuntu OpenSSH server documentation: https://ubuntu.com/server/docs/how-to/security/openssh-server/
- Ubuntu 22.04 sshd_config(5) man page: https://manpages.ubuntu.com/manpages/jammy/man5/sshd_config.5.html
- Ubuntu openssh-server package file list for Jammy: https://packages.ubuntu.com/jammy/arm64/openssh-server/filelist
- Ubuntu 22.04 pam_faillock(8) man page: https://manpages.ubuntu.com/manpages/jammy/man8/pam_faillock.8.html
- Ubuntu 22.04 faillock.conf(5) man page: https://manpages.ubuntu.com/manpages/jammy/man5/faillock.conf.5.html
- Ubuntu auditd package information for Jammy: https://launchpad.net/ubuntu/jammy/+package/auditd
- Ubuntu systemctl(1) man page: https://manpages.ubuntu.com/manpages/jammy/en/man1/systemctl.1.html
- Ubuntu systemd-sysctl(8) man page: https://manpages.ubuntu.com/manpages/jammy/man8/systemd-sysctl.8.html
- Ubuntu auditctl(8) man page: https://manpages.ubuntu.com/manpages/jammy/man8/auditctl.8.html
- Ubuntu modprobe(8) and local modprobe.d(5) man pages
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html

## Issues Found
- The `apply()` helper logged failures but returned success because the final `log "FAILED"` command succeeded. I changed it to return a nonzero status after logging a failed command so `set -e` can stop the hardening run.
- The Ansible example fetched `/opt/hardening/logs/hardening-latest.log`, but the script only created timestamped log files. I added `LATEST_LOG_FILE` and updated the logging function to maintain that file.
- The PAM lockout snippet only inserted the `pam_faillock.so preauth` line. The Ubuntu `pam_faillock` documentation requires `authfail` and either `authsucc` or an account-phase call for correct failure recording and clearing. I added a `faillock.conf` file and inserted `preauth`, `authfail`, and `authsucc` lines.
- The SSH snippet used `Protocol 2`, which is not listed in the Ubuntu 22.04 `sshd_config(5)` directives and is unnecessary for current OpenSSH. I removed it.
- The SSH restart command used `systemctl restart sshd`, while Ubuntu's OpenSSH package provides `ssh.service` and Ubuntu documentation uses `systemctl restart ssh.service`. I changed the command to restart `ssh.service`.
- The SSH snippet wrote to `/etc/ssh/sshd_config.d/` without ensuring the directory existed and restarted without validating syntax. I added directory creation and an `sshd -t` validation step before restart.

## Review Notes
- The hardening script is illustrative and should still be tested on staging systems before production use, especially because disabling IPv6, TCP forwarding, X11 forwarding, and selected services can break legitimate workloads.
- The audit rules are valid examples but not a complete CIS audit rule set; a full production CIS implementation should include all benchmark-required rules for the selected Ubuntu release and architecture.

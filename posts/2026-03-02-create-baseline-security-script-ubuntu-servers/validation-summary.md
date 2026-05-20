# Validation Summary: How to Create a Baseline Security Script for Ubuntu Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu Server
- Bash scripting
- APT and unattended-upgrades
- OpenSSH server configuration
- UFW firewall
- Linux PAM and libpwquality
- Linux sysctl kernel parameters
- systemd services

## Sources Consulted
- `apt-get(8)` manual page: https://manpages.ubuntu.com/manpages/noble/en/man8/apt-get.8.html
- `sshd_config(5)` manual page: https://manpages.ubuntu.com/manpages/noble/en/man5/sshd_config.5.html
- `ufw(8)` manual page: https://manpages.ubuntu.com/manpages/noble/en/man8/ufw.8.html
- `pwquality.conf(5)` manual page: https://manpages.ubuntu.com/manpages/noble/en/man5/pwquality.conf.5.html
- `pam_pwquality(8)` manual page: https://manpages.ubuntu.com/manpages/noble/en/man8/pam_pwquality.8.html
- `login.defs(5)` manual page: https://manpages.ubuntu.com/manpages/noble/en/man5/login.defs.5.html
- `sysctl(8)` manual page: https://manpages.ubuntu.com/manpages/noble/en/man8/sysctl.8.html
- `unattended-upgrade(8)` manual page: https://manpages.ubuntu.com/manpages/noble/en/man8/unattended-upgrade.8.html
- Local systemd unit metadata for `ssh.service`, including the `sshd.service` alias.

## Issues Found
- The baseline coverage list claimed "file permission hardening," but the script does not implement file permission checks or changes. Changed the bullet to "Automatic security updates," which the script does configure.
- The package update section said it applied "security updates only" and used `apt-get upgrade --only-upgrade`. The `apt-get(8)` documentation describes `upgrade` as upgrading installed packages from configured sources, while `--only-upgrade` applies to `install`. Updated the comment and removed the misleading option.
- The SSH snippet included `Protocol 2`, which is not a valid `sshd_config` option in current OpenSSH releases shipped by modern Ubuntu versions. Removed the obsolete directive.
- The SSH snippet said it would disconnect idle sessions after 10 minutes, but `ClientAliveCountMax 0` disables connection termination according to `sshd_config(5)`. Changed the comment to "unresponsive sessions" and set `ClientAliveCountMax 1`.
- The password policy section wrote `pwquality.conf` but did not ensure PAM was using `pam_pwquality.so`. Added an idempotent check and `pam-auth-update --enable pwquality --force` fallback so the policy is actually applied to password changes.
- The password aging message implied all accounts were affected, but `login.defs(5)` states those values are used at account creation time and do not affect existing accounts. Updated the comment and status message to clarify they are defaults for new accounts.

## Review Notes
- The SSH cipher, MAC, and key exchange algorithm names are valid in current OpenSSH documentation, but restricting algorithm lists can affect older clients. Test against your client fleet before enforcing these settings broadly.
- The script intentionally leaves `PasswordAuthentication no` commented out, which is appropriate for avoiding lockouts until SSH key access is verified.
- The `systemctl restart sshd` command is acceptable on Ubuntu systems where `ssh.service` provides the `sshd.service` alias.

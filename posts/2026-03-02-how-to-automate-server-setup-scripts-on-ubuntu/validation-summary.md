# Validation Summary: How to Automate Server Setup Scripts on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu Server
- Bash scripting
- APT and dpkg package management
- OpenSSH server configuration
- Linux user and group management
- UFW firewall
- systemd services
- unattended-upgrades

## Sources Consulted
- GNU Bash Reference Manual: https://www.gnu.org/s/bash/manual/html_node/The-Set-Builtin.html
- Ubuntu sshd_config manpage: https://manpages.ubuntu.com/manpages/jammy/man5/sshd_config.5.html
- Ubuntu OpenSSH server documentation: https://ubuntu.com/server/docs/how-to/security/openssh-server/
- Ubuntu ufw manpage: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Ubuntu useradd manpage: https://manpages.ubuntu.com/manpages/jammy/man8/useradd.8.html
- GNU coreutils groups documentation: https://www.gnu.org/software/coreutils/groups
- systemctl manual: https://www.freedesktop.org/software/systemd/man/systemctl.html
- Ubuntu timedatectl manpage: https://manpages.ubuntu.com/manpages/noble/man1/timedatectl.1.html
- apt-get manual: https://manpages.ubuntu.com/manpages/noble/man8/apt-get.8.html
- Debian unattended-upgrades README: https://sources.debian.org/src/unattended-upgrades/2.9.1%2Bnmu3/README.md/
- unattended-upgrade manpage: https://manpages.debian.org/unattended-upgrade

## Issues Found
- Removed `Protocol 2` from the OpenSSH configuration example. Current Ubuntu OpenSSH documentation lists supported `sshd_config` keywords without this obsolete SSH protocol selector, and OpenSSH only supports SSH protocol 2 in modern releases.
- Replaced the `groups "$user" | grep -q "\b${group}\b"` membership check with `id -nG "$user" | tr ' ' '\n' | grep -qxF "$group"` so group matching is exact and does not depend on regex word-boundary behavior.
- Updated `deploy_authorized_keys` to verify the target user exists before using the home directory, and to chown files to the user's actual primary group from `id -gn` instead of assuming the group name matches the username.
- Clarified the UFW reset comment. `ufw --force reset` is valid and repeatable, but it removes existing UFW rules, so the comment now describes it as creating a repeatable baseline rather than implying no destructive side effects.
- Replaced interactive `dpkg-reconfigure -plow unattended-upgrades` in the automation flow with writing `/etc/apt/apt.conf.d/20auto-upgrades`, using the APT periodic settings documented by unattended-upgrades for manual activation.

## Review Notes
The corrected shell snippets parse successfully with `bash -n`. The examples remain intentionally generic; production scripts should still be tested on the exact Ubuntu release and image baseline used for deployment, especially before applying SSH and firewall changes remotely.

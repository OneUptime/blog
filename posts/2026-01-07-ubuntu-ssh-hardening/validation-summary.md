# Validation Summary: How to Harden SSH on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide — step-by-step hands-on guide to hardening OpenSSH on Ubuntu with layered security controls.

## Technologies Covered
- OpenSSH server (`sshd`) and client (`ssh`, `ssh-keygen`, `ssh-copy-id`)
- Ubuntu (20.04 / 22.04 / 24.04 LTS), systemd service & socket activation
- fail2ban (jails, filters, `fail2ban-client`)
- knockd (port knocking) + iptables / netfilter-persistent
- UFW firewall
- Google Authenticator PAM module (`libpam-google-authenticator`), PAM (`/etc/pam.d/sshd`)
- TOTP-based two-factor authentication
- SSH cryptography settings (KexAlgorithms, Ciphers, MACs, HostKeyAlgorithms)
- unattended-upgrades

## Sources Consulted
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config and https://manpages.debian.org/unstable/openssh-server/sshd_config.5.en.html
- OpenSSH legacy/removed options (Protocol directive removal): https://www.openssh.org/legacy.html and https://github.com/imthenachoman/How-To-Secure-A-Linux-Server/issues/118
- Ubuntu 24.04 SSH socket activation behavior (port change requires `ssh.socket`): https://dev.to/saishanmukkha/understanding-ssh-socket-based-activation-in-ubuntu-2404-28m and https://4sysops.com/archives/how-to-change-the-ssh-port-on-ubuntu-2404/
- fail2ban documentation: https://www.fail2ban.org/wiki/index.php/Main_Page and packaged `jail.conf` defaults (sshd `mode`, `backend = systemd`, `bantime.increment`)
- Google Authenticator PAM module: https://github.com/google/google-authenticator-libpam
- knockd man page (`knockd.conf`, `start_command`/`cmd_timeout`/`stop_command`): https://linux.die.net/man/1/knockd

## Issues Found
1. **`Protocol 2` directive (Section 9) — removed/unsupported option.** The hardening config block included `Protocol 2`. The `Protocol` directive was removed from OpenSSH (which now only speaks protocol 2); on every Ubuntu release the post targets (20.04+, OpenSSH 8.2+) this line makes `sshd -t` fail with an "Unsupported option Protocol" error — which directly contradicts the post's own instruction to validate with `sudo sshd -t`. Replaced the directive with a short comment explaining why it is omitted.

2. **Changing the SSH port on Ubuntu 22.10+/24.04 (Section 5) — incomplete steps.** The post claims compatibility with Ubuntu 24.04 but only edits the `Port` directive and restarts `sshd`. Since Ubuntu 22.10, SSH uses systemd socket activation, where the listening port is governed by `ssh.socket`; editing `sshd_config` alone leaves SSH listening on port 22. Added a note and the required `sudo systemctl daemon-reload` + `sudo systemctl restart ssh.socket` steps (plus an `ss` verification) so the port change actually takes effect on supported releases.

## Review Notes
- **`ChallengeResponseAuthentication` is a deprecated alias.** In OpenSSH 8.7+ (Ubuntu 22.04 ships 8.9) `ChallengeResponseAuthentication` is a deprecated alias for `KbdInteractiveAuthentication`. It still works and does not error, so it was left as written; the post already sets `KbdInteractiveAuthentication` alongside it in the 2FA section, which is the correct forward-looking key.
- **fail2ban `logpath` vs `backend = systemd`.** The `[sshd]` jail sets both `backend = systemd` and `logpath = %(sshd_log)s`. With the systemd backend the `logpath` is effectively ignored rather than erroring; this is a harmless redundancy on modern Ubuntu where SSH logs go to the journal.
- **Custom filter `sshd-aggressive.local` is not wired to the jail.** Section 6 creates `filter.d/sshd-aggressive.local` but the `[sshd]` jail uses the default `sshd` filter with `mode = aggressive`. The custom file is therefore unused unless `filter = sshd-aggressive` is set. Not incorrect (the built-in aggressive mode already covers these patterns), just unused — worth tidying in a future revision.
- **knockd with `-j DROP` knock ports.** Dropping the knock ports (7000/8000/9000) is intentional and works because knockd captures packets via libpcap before/independent of the firewall verdict, so it still sees the knocks. Correct as written.
- **`systemctl restart sshd`.** On Ubuntu the unit is `ssh.service` with an `sshd.service` alias, so `sshd` works; this is consistent with the post's use of `journalctl -u ssh`. No change needed.
- **External links** (OpenSSH, fail2ban, Ubuntu Security, CIS Benchmarks) are valid and point to the correct resources.

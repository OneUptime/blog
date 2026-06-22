# Validation Summary: How to Enable SSH on Ubuntu Desktop

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenSSH server (sshd) on Ubuntu Desktop
- systemd service management (systemctl)
- UFW (Uncomplicated Firewall)
- ssh-keygen / ssh-copy-id key-based authentication (Ed25519, RSA)
- sshd_config server configuration directives
- scp and rsync file transfer
- SSH tunneling (local, remote, dynamic port forwarding)
- X11 forwarding
- fail2ban
- Network/diagnostic tooling (ss, netstat, ip, hostname, nc, journalctl)

## Sources Consulted
- OpenSSH manual pages: sshd_config(5), ssh_config(5), ssh(1), ssh-keygen(1), ssh-copy-id(1), scp(1) — https://man.openbsd.org/sshd_config
- Ubuntu Server documentation: OpenSSH server — https://documentation.ubuntu.com/server/how-to/security/openssh-server/
- Ubuntu UFW community help — https://help.ubuntu.com/community/UFW
- fail2ban documentation — https://github.com/fail2ban/fail2ban
- "Understanding SSH Socket-Based Activation in Ubuntu 24.04" — https://dev.to/saishanmukkha/understanding-ssh-socket-based-activation-in-ubuntu-2404-28m
- "How to Change SSH Port on Ubuntu 24.04" — https://scohostings.com/how-to-change-ssh-port-ubuntu-24-04/

## Issues Found
No technical issues found.

All commands, flags, and configuration directives were verified and are correct:
- Package install (`openssh-server`) and verification (`ssh -V`) are accurate.
- systemd unit name `ssh` is correct on Ubuntu (with `sshd` as an alias).
- All `sshd_config` directives used (`PermitRootLogin`, `AllowUsers`, `AllowGroups`, `PasswordAuthentication`, `PubkeyAuthentication`, `PermitEmptyPasswords`, `MaxAuthTries`, `LoginGraceTime`, `X11Forwarding`, `X11DisplayOffset`, `Port`) are valid and spelled correctly.
- `sudo sshd -t` config-syntax test, key generation, key copying, port-forwarding (`-L`/`-R`/`-D`), scp/rsync, and the fail2ban jail snippet are all correct.
- UFW commands are accurate.

## Review Notes
- **Socket activation caveat (Ubuntu 22.10+ / 24.04 LTS):** Modern Ubuntu installs OpenSSH with systemd socket activation (`ssh.socket`) listening on port 22. The post's "Change SSH Port" section restarts only `ssh.service` (`sudo systemctl restart ssh`). On socket-activated systems this alone may not move the listening port — the recommended approach is to also run `sudo systemctl daemon-reload` and `sudo systemctl restart ssh.socket` (Ubuntu 24.04 reads `Port` from `sshd_config` once the socket is restarted). This is not an error in the commands shown (they remain correct on releases without socket activation, e.g. 20.04/22.04), but readers on 24.04 should be aware. Left unchanged to avoid restructuring the post.
- `netstat` (line 47) requires the `net-tools` package, which is not installed by default on modern Ubuntu. The post correctly presents `ss` first and offers netstat only as an alternative, so this is acceptable.
- The post candidly frames "change default port" as security through obscurity, which is the accurate characterization.
- Security guidance (key-based auth, disabling root login, restricting users, fail2ban) reflects current best practice.

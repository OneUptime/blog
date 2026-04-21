# Validation Summary: How to Restrict SSH Tunneling by IPv4 Address in sshd_config

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenSSH
- sshd_config
- SSH TCP port forwarding and tunneling
- authorized_keys key options
- systemd service reloads

## Sources Consulted
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- OpenSSH `sshd(8)` manual, authorized_keys file format: https://man.openbsd.org/sshd
- OpenSSH `ssh(1)` manual, `-4` and `-L` forwarding options: https://man.openbsd.org/ssh
- OpenSSH `ssh_config(5)` manual, `ExitOnForwardFailure` behavior: https://man.openbsd.org/ssh_config
- Local OpenSSH parser check with `sshd -t` on OpenSSH_9.6p1 Ubuntu-3ubuntu13.15

## Issues Found
- The description said the configuration would prevent unauthorized tunnel abuse. Updated it to say it reduces unauthorized tunnel abuse, because OpenSSH documents that disabling forwarding alone is not a complete security boundary for users with shell access.
- The `PermitOpen` description and example implied it restricted all forwarding destinations. Updated the wording to specify local forwarding destinations, matching the OpenSSH documentation for `PermitOpen`.
- The `AllowTcpForwarding yes` comment said it allowed all clients to connect via SSH. Updated it to say it allows TCP forwarding for authenticated clients, because SSH login access is controlled by separate authentication and authorization settings.
- The per-user denial example placed `Match User deployment_bot` after a broader allow block. Reordered it before the group/address allow block, because OpenSSH applies only the first instance of a keyword when multiple satisfied `Match` blocks set the same keyword.
- The verification command said `ssh -L` should fail immediately when forwarding is disabled. Updated it to say traffic through the local forwarded port should fail, because the SSH login may still succeed while forwarded connection attempts are rejected.

## Review Notes
- The corrected `sshd_config` snippets were syntax-checked successfully with `sshd -t` using OpenSSH_9.6p1 and a temporary host key.
- `systemctl reload sshd` is valid on systems whose OpenSSH server unit is named `sshd`; some distributions use `ssh` instead.

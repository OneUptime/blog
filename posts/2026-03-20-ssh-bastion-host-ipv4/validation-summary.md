# Validation Summary: How to Set Up an SSH Bastion Host for IPv4 Network Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH server configuration (`sshd_config`)
- OpenSSH client configuration (`~/.ssh/config`, `ProxyJump`)
- SSH, SCP, and local port forwarding
- Linux iptables firewall rules
- Linux auditd / `auditctl`
- IPv4 private and documentation address ranges

## Sources Consulted
- OpenSSH manual pages index: https://www.openssh.org/manual.html
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh
- OpenSSH `scp(1)` manual: https://man.openbsd.org/scp
- Linux `iptables(8)` manual: https://man7.org/linux/man-pages/man8/iptables.8.html
- Ubuntu `auditctl(8)` manual: https://manpages.ubuntu.com/manpages/noble/man8/auditctl.8.html
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737.html
- Local OpenSSH tooling: `ssh -V`, `ssh -G`, `sshd -t`, and `scp` usage output

## Issues Found
- The `sshd_config` example placed `ClientAliveInterval`, `ClientAliveCountMax`, `LoginGraceTime`, and `LogLevel` after `Match User alice`. In OpenSSH, a `Match` block continues until another `Match` line or the end of the file, and `LoginGraceTime` is not valid inside a `Match` block. I moved the `Match User alice` override to the end of the snippet so the configuration parses correctly and the timeout/logging directives remain global.
- The `AllowTcpForwarding no` comment said "Default off", but OpenSSH's default for `AllowTcpForwarding` is `yes`. I changed the comment to clarify that the example policy sets forwarding off by default.
- The port-forwarding example used `-J` to connect to `ubuntu@10.0.0.10`, which means the `-L` destination would be opened from the final internal host, not from the bastion. I changed the example to connect directly to the bastion for forwarding to `10.0.0.20:5432`.
- The firewall rules used the `FORWARD` chain to allow SSH from the bastion to internal servers. For a normal SSH bastion using `ProxyJump`, the bastion opens a local outbound TCP connection, so this traffic belongs to the `OUTPUT` chain, not `FORWARD`. I replaced that example with an `OUTPUT` rule, kept `FORWARD` only as a packet-forwarding block, and added internal-host/cloud-firewall rules to restrict SSH to the bastion's private IP.
- The auditing snippet claimed shell history would "log all commands" and assumed `/var/log/bash_history` already existed with usable permissions. Shell history is only interactive-session history and is not tamper-resistant audit logging. I changed the wording to "Record interactive shell history", added a one-time directory creation command, and left `auditd` as the comprehensive audit option.

## Review Notes
- The OpenSSH client examples for `ProxyJump`, `AddressFamily inet`, `ssh -4`, `scp -J`, and `ssh -L` are current and valid for modern OpenSSH. The local environment has OpenSSH_9.6p1.
- `203.0.113.10` and `198.51.100.0/24` are RFC 5737 documentation addresses. They are appropriate examples but must be replaced with real assigned addresses in production.
- The iptables examples are illustrative and assume rule ordering is adapted to the host's existing firewall policy.

# Validation Summary: How to Configure SSH ProxyCommand for IPv4 Multi-Hop Connections

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenSSH client
- ssh_config
- ProxyJump / -J
- ProxyCommand
- ssh -W stdio forwarding
- scp over SSH
- netcat / nc
- SSH agent forwarding
- IPv4 addressing

## Sources Consulted
- OpenSSH ssh_config(5): https://man.openbsd.org/ssh_config
- OpenSSH ssh(1): https://man.openbsd.org/ssh
- OpenSSH scp(1): https://man.openbsd.org/scp
- OpenSSH release notes: https://www.openssh.org/releasenotes.html
- OpenBSD nc(1): https://man.openbsd.org/nc
- Local OpenSSH 9.6p1 man pages and `ssh -G` / `ssh -vvv` expansion checks

## Issues Found
- The netcat ProxyCommand example used `nc -q0`, which is a netcat-variant-specific option and is not documented by the OpenBSD nc(1) manual. Changed the example to `nc %h %p`, which is the portable form needed for an SSH ProxyCommand pipe.
- The agent forwarding section incorrectly implied that `ForwardAgent yes` is required to authenticate through a `ProxyJump`. OpenSSH jump-host mode keeps authentication in the local SSH client and uses TCP forwarding through the jump host. Updated the text, config snippet, and takeaway to keep agent forwarding disabled unless the remote host itself must initiate further SSH connections.
- The `ProxyCommand ssh -W %h:%p bastion` takeaway described the approach broadly as for "older clients." Clarified that it applies to clients that support `-W` but do not support `ProxyJump`.

## Review Notes
- `ProxyJump` and the `-J` command-line flag were verified as OpenSSH 7.3+ features.
- `AddressFamily inet` is valid and correctly forces IPv4.
- `ssh -W %h:%p` correctly forwards client standard input/output to the target host and port over the bastion connection.
- `scp -J` is supported by current OpenSSH scp and maps to `ProxyJump`.
- The chained `ProxyJump` configuration was locally verified to expand through both jump hosts.

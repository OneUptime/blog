# Validation Summary: How to Use SSH ProxyJump to Access IPv4 Servers Through a Jump Host

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenSSH client
- SSH ProxyJump / jump hosts
- SSH client configuration (`~/.ssh/config`)
- SCP, SFTP, and rsync over SSH
- SSH local port forwarding
- SSH agent authentication
- IPv4 networking

## Sources Consulted
- OpenSSH release notes: https://www.openssh.org/releasenotes.html
- OpenBSD `ssh(1)` manual page: https://man.openbsd.org/ssh.1
- OpenBSD `ssh_config(5)` manual page: https://man.openbsd.org/ssh_config.5
- OpenBSD `scp(1)` manual page: https://man.openbsd.org/scp.1
- OpenBSD `sftp(1)` manual page: https://man.openbsd.org/sftp.1
- rsync official man page: https://download.samba.org/pub/rsync/rsync.1
- Local CLI checks with OpenSSH_9.6p1, `ssh -G`, `scp` usage, `sftp` usage, and `rsync --help`

## Issues Found
- The introduction said ProxyJump uses "a single key authentication step." Updated it to state that ProxyJump uses a single command while authentication is handled for each SSH hop. OpenSSH documents ProxyJump as first connecting to the jump host, then establishing TCP forwarding to the final target.
- The basic usage comment said `ssh -4 -J ...` would "Force IPv4 throughout." Updated the wording to "Use IPv4-only mode with IPv4 addresses" because OpenSSH notes that command-line destination configuration generally does not apply to jump hosts. The example remains correct because it uses IPv4 literal addresses.
- The agent section recommended `ForwardAgent yes` for normal ProxyJump authentication. Updated it to use the local SSH agent without forwarding the agent to the jump host. OpenSSH documents agent forwarding as forwarding the agent connection to the remote machine and warns that it should be enabled with caution; normal ProxyJump target authentication can use the local client's keys or local agent through the tunnel.

## Review Notes
- `ProxyJump` and `-J` were correctly identified as OpenSSH 7.3 features.
- The `ProxyJump` config directives, comma-separated multi-hop examples, `scp -J`, `sftp -J`, and rsync `-e "ssh -J ..."` examples are current and valid.
- The local port-forwarding example is technically valid: `-L` creates a listener on the client side and connects from the remote side of the final SSH session.
- For named jump hosts that must be forced to IPv4, keep `AddressFamily inet` in the jump host's own `Host` block, as the post demonstrates.

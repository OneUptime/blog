# Validation Summary: How to Configure SSH Jump Hosts (ProxyJump) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- OpenSSH client
- SSH ProxyJump
- SSH client configuration
- scp
- sftp
- rsync over SSH
- SSH local and dynamic port forwarding
- netcat connectivity testing

## Sources Consulted
- OpenSSH ssh(1) manual page: https://man.openbsd.org/ssh.1
- OpenSSH ssh_config(5) manual page: https://man.openbsd.org/ssh_config.5
- OpenSSH scp(1) manual page: https://man.openbsd.org/scp.1
- OpenSSH sftp(1) manual page: https://man.openbsd.org/sftp.1
- OpenSSH 7.3 release notes: https://www.openssh.org/releasenotes.html
- Local Ubuntu OpenSSH 9.6p1 man pages and `ssh -G` output

## Issues Found
- The target-port example used `appuser@10.0.1.50:2222`. OpenSSH `ssh` does not parse that form as a target port; it treats `10.0.1.50:2222` as the hostname. Changed it to `ssh -J jumpuser@bastion.example.com:22 -p 2222 appuser@10.0.1.50`.
- The SOCKS proxy explanation implied the proxy could reach any internal host purely by going through the bastion. With `ssh -J user@bastion -D 1080 user@internal-server -N`, SOCKS connections exit from `internal-server`, so reachability depends on what `internal-server` can reach. Updated the wording to make that clear.

## Review Notes
The remaining ProxyJump, ProxyCommand, ForwardAgent, StrictHostKeyChecking, scp, sftp, and forwarding examples align with current OpenSSH behavior. For future improvement, the post could mention that jump-host-specific options should be configured under the jump host's own `Host` entry because destination host options are not generally applied to jump hosts.

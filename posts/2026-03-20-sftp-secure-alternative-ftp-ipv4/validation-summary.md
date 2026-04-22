# Validation Summary: How to Use SFTP as a Secure FTP Alternative on IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SFTP
- SSH
- OpenSSH
- sshd_config
- IPv4 source restrictions
- chroot jails
- iptables
- scp
- rsync

## Sources Consulted
- OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config.5
- OpenSSH sftp(1) manual: https://man.openbsd.org/sftp.1
- OpenSSH scp(1) manual: https://man.openbsd.org/scp.1
- OpenSSH 6.7 release notes: https://www.openssh.org/txt/release-6.7
- rsync(1) man page: https://download.samba.org/pub/rsync/rsync.1
- Local OpenSSH ssh-copy-id(1) man page and `ssh-copy-id -h` output from OpenSSH_9.6p1 on Ubuntu
- Local `sftp -h`, `scp -h`, `rsync --help`, and `iptables --help` output

## Issues Found
- The post described SFTP as using port 22 only. SFTP uses SSH port 22 by default, but SSH can be configured for another port, so the wording was changed to "22 by default."
- The post showed `/usr/lib/openssh/sftp-server` as the single expected SFTP subsystem path. That path is distribution-specific, so the example now accepts `internal-sftp` or a distribution-specific `sftp-server` path.
- The SFTP-only `Match` block disabled TCP and X11 forwarding but left other forwarding types available. OpenSSH documents that `ForceCommand` does not disable forwarding by itself, so the block now uses `DisableForwarding yes`.
- The chroot setup only stated that the final chroot directory must be root-owned. OpenSSH requires all components of the chroot path to be root-owned and not writable by group or others, so the commands now set ownership and mode on `/srv/sftp` and the per-user chroot directory.
- The SSH reload command used `sshd` only. A note was added that Debian/Ubuntu systems may use the `ssh` service name.
- The IPv4 restriction example used `Address !10.0.0.0/8`, but OpenSSH pattern negation does not produce a positive match by itself. The deny block now includes a wildcard and excludes both allowed source ranges: `Address !10.0.0.0/8,!203.0.113.20,*`.
- The TCP Wrappers example was outdated. OpenSSH 6.7 removed tcpwrappers/libwrap support, so the post now directs readers to `sshd_config` or firewall rules instead.
- The post called `rsync -e ssh` "rsync over SFTP." rsync with a single-colon remote path uses a remote shell such as SSH, not SFTP, and it will not work for a `ForceCommand internal-sftp` account. The example now states that it is rsync over SSH and requires shell access.
- The scp note was updated to reflect current OpenSSH behavior: OpenSSH 9.0 and later use SFTP for scp transfers by default.
- The SSH key example used `ssh-copy-id`, which normally installs keys by executing remote commands and is unreliable for a SFTP-only account with `ForceCommand internal-sftp`. The example now installs `authorized_keys` locally with `install`.
- The conclusion said public key authentication eliminates password exposure entirely. The wording now says it lets administrators avoid password authentication for SFTP users, which is more precise.

## Review Notes
- The iptables example is syntactically valid, but it is intentionally broad: it restricts all SSH access on port 22, not just SFTP. In production, equivalent nftables/firewalld/cloud firewall rules may be preferable depending on the host.
- The example uses documentation IP addresses from `203.0.113.0/24`; real deployments must replace them with addresses assigned to the server and trusted clients.

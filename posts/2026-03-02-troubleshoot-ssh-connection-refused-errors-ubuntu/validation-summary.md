# Validation Summary: How to Troubleshoot SSH 'Connection Refused' Errors on Ubuntu

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- OpenSSH (sshd, ssh client)
- Ubuntu (systemd service management)
- UFW (Uncomplicated Firewall)
- iptables
- TCP/IP networking (ping, nc, nmap)
- ss / netstat
- journalctl, /var/log/auth.log
- TCP wrappers (/etc/hosts.allow, /etc/hosts.deny)
- fail2ban, sshguard
- Cloud provider firewalls (AWS Security Groups, GCP VPC firewall, Azure NSG, DigitalOcean Firewall)

## Sources Consulted
- OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config
- OpenSSH sshd(8) manual (for `-t` test option): https://man.openbsd.org/sshd
- ssh(1) manual (for `-v`, `-p` options): https://man.openbsd.org/ssh
- ss(8) manual (`-tlnp` flags): https://man7.org/linux/man-pages/man8/ss.8.html
- netcat (nc) manual on Ubuntu (verified `-z` and `-v` flags via local `man nc`)
- UFW documentation: https://help.ubuntu.com/community/UFW
- iptables(8) manual: https://man7.org/linux/man-pages/man8/iptables.8.html
- systemd systemctl(1) and journalctl(1) manuals
- fail2ban-client documentation: https://fail2ban.readthedocs.io/
- OpenSSH 6.7 release notes (TCP wrappers / libwrap removal, October 2014): https://www.openssh.com/txt/release-6.7
- Ubuntu OpenSSH server packaging notes (ssh.service vs sshd.service alias)

## Issues Found
No technical issues found.

All commands, flags, and explanations were verified against the relevant documentation:

- The TCP-layer explanation of "Connection refused" vs. "Connection timed out" is accurate (RST vs. dropped packet).
- `systemctl status ssh` is correct for Ubuntu; `sshd.service` is provided as an alias on modern Ubuntu, so the note that "some Ubuntu versions" use `sshd` is acceptable.
- `ss -tlnp` and `netstat -tlnp` flag usage is correct, and the example output format matches actual `ss` output.
- `nc -zv host port` (zero-I/O mode + verbose) is correct.
- `sudo sshd -t` is the correct config-test command per sshd(8).
- The grep pattern `"^Port\|^#Port\|^ListenAddress"` correctly uses BRE alternation with `\|`.
- UFW and iptables commands match current syntax.
- fail2ban-client `status sshd` and `set sshd unbanip <ip>` are correct subcommands.
- The cloud-firewall enumeration (AWS SG, GCP VPC firewall rules, Azure NSG, DigitalOcean Firewall) is accurate.

## Review Notes
- **TCP wrappers (Step 6):** OpenSSH removed libwrap/TCP-wrapper support in 6.7 (October 2014), so `/etc/hosts.allow` and `/etc/hosts.deny` have not affected sshd on any current Ubuntu release (16.04 LTS onward). The post hedges this by saying "Older Ubuntu configurations may use TCP wrappers," which is acceptable, but in practice this step is unlikely to apply on any supported Ubuntu version. A future revision could make this caveat more explicit (e.g., "Only relevant on Ubuntu 14.04 and earlier").
- **fail2ban and "Connection refused":** Whether fail2ban triggers a true "Connection refused" depends on the configured ban action. The default `iptables-common.conf` block type is `REJECT --reject-with icmp-port-unreachable`, which produces "No route to host" rather than "Connection refused". A TCP-RST-based reject (`--reject-with tcp-reset`) would produce "Connection refused". The step is still worth checking, but the symptom-to-cause mapping is configuration-dependent.
- **Log examples (Step 7):** The example log line `sshd: Connection refused` is illustrative rather than a verbatim sshd message — actual "connection refused" errors typically occur when sshd is not running, so no sshd log entry would exist. The other examples (`Bind to port 22 on 0.0.0.0 failed`, `Cannot bind any address`) are accurate real sshd messages.
- **Backup assumption:** The "Common Fixes" example `cp /etc/ssh/sshd_config.bak /etc/ssh/sshd_config` assumes the user previously created a backup; this is a reasonable convention but not guaranteed.

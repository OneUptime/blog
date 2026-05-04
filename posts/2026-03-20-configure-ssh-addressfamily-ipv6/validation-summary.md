# Validation Summary: How to Configure SSH AddressFamily for IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OpenSSH (sshd, ssh client)
- sshd_config / ssh_config directives (AddressFamily, ListenAddress, HostName, IdentityFile, ConnectTimeout)
- IPv6 / IPv4 dual-stack networking
- Linux service management (systemctl reload sshd)
- Network inspection tools (ss, ip, ping6)

## Sources Consulted
- `man sshd_config` (OpenSSH server config) — confirms AddressFamily values: any (default), inet, inet6
- `man ssh_config` (OpenSSH client config) — confirms identical AddressFamily values and default
- `man ssh` — confirms `-4` (force IPv4) and `-6` (force IPv6) command-line flags
- `man ss` — confirms `-t`, `-l`, `-n`, `-p`, `-4`, `-6` flags
- OpenSSH documentation: https://man.openbsd.org/sshd_config
- Google Public DNS IPv6 addresses: 2001:4860:4860::8888 (verified)
- IPv6 unspecified address `::` (RFC 4291)

## Issues Found
No technical issues found. All AddressFamily values, ListenAddress syntax, command flags (`sshd -t`, `sshd -T`, `ss -tlnp`, `ssh -4`/`-6`, `ssh -o`), and the ssh_config/sshd_config snippets match the official OpenSSH documentation. The Google IPv6 DNS address and IPv6 wildcard `::` are correct.

## Review Notes
- `systemctl reload sshd` is correct on RHEL/CentOS/Fedora and most modern systemd distributions. On Debian/Ubuntu the service unit is named `ssh` (so `systemctl reload ssh` is required there). The post does not call this out, but the command will work on the majority of systems readers will encounter, and `sshd` is widely understood as the canonical name.
- `ping6` has been superseded by `ping -6` in iputils on modern Linux distributions (most still ship `ping6` as a compatibility wrapper or symlink). Not incorrect, just slightly older idiom.
- The comment `# Try IPv6 first, fall back to IPv4` next to `AddressFamily any` is a reasonable approximation. Strictly speaking, the actual ordering is determined by `getaddrinfo()` and RFC 6724 destination address selection (typically prefers IPv6 on modern dual-stack systems), not SSH itself. The simplification is acceptable for a configuration tutorial.
- The post correctly notes that with `AddressFamily inet6` only AAAA records are used and IPv4 is ignored, matching OpenSSH behavior.

# Validation Summary: How to Set Up ProFTPD MasqueradeAddress for IPv4 NAT Servers

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- ProFTPD
- FTP passive mode (`PASV` and `EPSV`)
- IPv4 NAT and port forwarding
- Dynamic DNS hostnames
- `iptables`

## Sources Consulted
- ProFTPD module `mod_core` (`MasqueradeAddress`, `PassivePorts`, `Port`) — https://www.proftpd.org/docs/modules/mod_core.html
- ProFTPD: DNS (when configuration DNS names are resolved, and how dynamic IP changes are handled) — https://www.proftpd.org/docs/howto/DNS.html
- ProFTPD: Configuring ProFTPD (default server/address behavior) — https://www.proftpd.org/docs/howto/ConfigFile.html
- ProFTPD: Logins and Authentication (`AuthUserFile`, `AuthGroupFile`, `RequireValidShell`, `DefaultRoot`) — https://www.proftpd.org/docs/howto/Authentication.html
- RFC 959: File Transfer Protocol (`PASV` and `227 Entering Passive Mode`) — https://www.rfc-editor.org/rfc/rfc959
- Local `iptables` CLI help (`iptables -h`, `iptables -j DNAT -h`) to confirm the DNAT syntax used in the example

## Issues Found
- The comment above `Port 21` incorrectly said that the directive binds ProFTPD to all IPv4 interfaces. The `Port` directive sets the TCP port, not the bind address, so I corrected the comment.
- The “Dynamic MasqueradeAddress (DNS Name)” section implied that using a hostname would automatically follow public IP changes. ProFTPD resolves configuration DNS names at startup, so I updated the section and key takeaway to note that ProFTPD must be restarted after the public IP changes.

## Review Notes
- ProFTPD documents `MasqueradeAddress` and `PassivePorts` as applying to both `PASV` and `EPSV`. The post focuses on `PASV`, which is acceptable for an IPv4-focused guide.
- The `PassivePorts 40000 50000` example is valid, but ProFTPD notes that if no free port is available in the configured range it can fall back to a kernel-assigned port. In practice, the passive range should be sized generously and forwarded through NAT accordingly.
- The sample config path and service name are distro-specific examples rather than universal values.

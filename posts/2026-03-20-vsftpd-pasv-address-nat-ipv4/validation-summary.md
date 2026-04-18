# Validation Summary: How to Set vsftpd pasv_address for NAT and IPv4 Environments

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- vsftpd (Very Secure FTP Daemon)
- FTP protocol (RFC 959 passive mode)
- NAT / iptables DNAT
- UFW (Uncomplicated Firewall)
- AWS Security Groups, Azure NSGs
- DNS / Dynamic DNS (DuckDNS, No-IP)

## Sources Consulted
- vsftpd.conf(5) man page and official documentation: https://security.appspot.com/vsftpd/vsftpd_conf.html
- RFC 959 - File Transfer Protocol: https://www.rfc-editor.org/rfc/rfc959
- iptables(8) man page - `-t nat`, `PREROUTING`, `DNAT`, `multiport` match
- UFW manual - ufw(8) syntax for `proto`, `to`, `port` with range syntax
- AWS EC2 / Security Group documentation for FTP passive mode

## Issues Found
No technical issues found.

Verified items:
- `pasv_address`, `pasv_addr_resolve`, `pasv_enable`, `pasv_min_port`, `pasv_max_port`, `listen`, `listen_ipv6` are all valid vsftpd.conf directives with correct semantics.
- `pasv_addr_resolve=YES` correctly interprets `pasv_address` as a DNS hostname to resolve.
- PASV response format `(h1,h2,h3,h4,p1,p2)` matches RFC 959.
- Port calculation `117*256 + 49 = 30001` is mathematically correct.
- iptables DNAT syntax for preserving destination ports on a range (`--dport 30000:31000 -j DNAT --to-destination $PRIVATE_IP` without explicit port) is correct — iptables preserves the original destination port when none is specified.
- `-m multiport --dports 21,30000:31000` is valid multiport syntax (mixing single port and range).
- UFW range syntax `port 30000:31000` with `proto tcp` is accepted.

## Review Notes
- The post writes "private IP in the PASV response" — technically vsftpd advertises whichever interface IP it binds to (or `pasv_address` if set), which in NAT scenarios is typically the private IP. This is accurate in context.
- FTP over plain port 21 (no TLS/FTPS) is used throughout; this is fine for a pasv_address configuration tutorial but readers should be aware that production FTP deployments should use FTPS or SFTP instead. Not a technical error in the post.
- The `telnet` verification example sends credentials in cleartext — appropriate for a debugging demonstration but worth noting.
- `listen_ipv6=NO` with `listen=YES` is correct for IPv4-only mode; these two are mutually exclusive in vsftpd.

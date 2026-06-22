# Validation Summary: How to Set Up a TFTP Server on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- TFTP
- tftpd-hpa
- atftpd
- UFW
- iptables
- xinetd
- Docker
- Cisco IOS TFTP commands

## Sources Consulted
- RFC 1350: The TFTP Protocol (Revision 2): https://datatracker.ietf.org/doc/html/rfc1350
- Debian tftpd-hpa in.tftpd man page: https://manpages.debian.org/testing/tftpd-hpa/tftpd.8.en.html
- Ubuntu atftpd man page for Ubuntu 24.04: https://manpages.ubuntu.com/manpages/noble/man8/tftpd.8.html
- Ubuntu atftpd man page for Ubuntu 20.04: https://manpages.ubuntu.com/manpages/focal/man8/atftpd.8.html
- Debian installation guide, Preparing Files for TFTP Net Booting: https://www.debian.org/releases/trixie/amd64/ch04s05.en.html

## Issues Found
- The prerequisites and firewall examples implied that UDP port 69 alone is sufficient. TFTP uses UDP port 69 for the initial request, then negotiated transfer identifiers are used as UDP ports. Updated the prerequisite and firewall examples to include a fixed `tftpd-hpa` transfer port range using `--port-range 50000:50100`.
- The iptables persistence example wrote to `/etc/iptables/rules.v4` without ensuring the persistence package and directory exist. Added installation of `iptables-persistent` before saving rules.
- The `--timeout` option was described as a general timeout and used for standalone `tftpd-hpa` troubleshooting. The `in.tftpd` manual states that `--timeout` is an inetd idle timeout and is ignored in listen/standalone mode. Updated the option table and troubleshooting example to use `--retransmit` for retransmission timing.
- The Docker run example published only UDP port 69. Updated it to publish the configured UDP transfer port range as well.

## Review Notes
The main package installation, default `tftpd-hpa` configuration shape, upload behavior with `--create`, `--secure` path behavior, `atftpd` options, xinetd service format, and basic TFTP client `get`/`put` examples are technically valid.

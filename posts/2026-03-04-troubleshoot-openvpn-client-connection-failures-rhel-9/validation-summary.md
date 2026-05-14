# Validation Summary: How to Troubleshoot OpenVPN Client Connection Failures on RHEL

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenVPN 2.x client and server configuration
- systemd and journald
- firewalld
- SELinux
- NetworkManager
- OpenSSL certificate validation
- Linux networking tools (`ip`, `ss`, `nc`, `resolvectl`)

## Sources Consulted
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- OpenVPN alternative authentication methods documentation: https://openvpn.net/community-resources/using-alternative-authentication-methods/
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 9 networking documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/index
- Local command/man-page checks for `openvpn --help`, `openvpn(8)`, `ss --help`, `resolvectl --help`, `ausearch(8)`, `setsebool(8)`, and `semanage-fcontext(8)`.

## Issues Found
- The post used `/var/log/openvpn/openvpn.log` as the default place to watch logs. On systemd-based RHEL deployments, OpenVPN service logs are commonly read from the journal unless the OpenVPN config explicitly sets a log file. Changed log-watching and diagnostic commands to use `journalctl -u openvpn-server@server`.
- The server listening check used `ss -ulnp`, which only checks UDP sockets. OpenVPN can run over UDP or TCP. Added a TCP check with `ss -ltnp` alongside the UDP check.
- The SELinux audit examples used inconsistent event type syntax. Updated them to query `AVC,USER_AVC` events with `ausearch -m AVC,USER_AVC -ts recent`, matching the audit tool's message-type usage.
- The DNS troubleshooting section referenced `/etc/openvpn/update-resolv-conf`, a Debian/Ubuntu-style helper path that is not a reliable RHEL default. Replaced it with RHEL-appropriate guidance: use NetworkManager integration if available from enabled repositories, or point `up`/`down` at a DNS update script that actually exists on the system.
- The status file example used `/var/log/openvpn/openvpn-status.log`. For the common `openvpn-server@server` systemd unit, the default status path is under `/run/openvpn-server/`. Updated the command to `/run/openvpn-server/status-server.log`.

## Review Notes
The remaining examples are technically plausible for a RHEL-style OpenVPN deployment, but some package names and paths can vary depending on whether OpenVPN and related plugins come from Red Hat-provided repositories, EPEL, or another vendor. The post now qualifies repository-dependent guidance where that matters.

# Validation Summary: How to Enable DNSSEC Validation in systemd-resolved

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- systemd-resolved
- resolvectl
- resolved.conf and systemd.network configuration
- DNSSEC
- DNS-over-TLS
- dig
- journalctl
- Ansible
- OneUptime DNSSEC monitoring

## Sources Consulted
- systemd resolved.conf manual: https://www.freedesktop.org/software/systemd/man/resolved.conf.html
- systemd systemd-resolved.service manual: https://www.freedesktop.org/software/systemd/man/systemd-resolved.service.html
- systemd resolvectl manual: https://www.freedesktop.org/software/systemd/man/resolvectl.html
- systemd systemd.network manual: https://www.freedesktop.org/software/systemd/man/systemd.network.html
- systemd dnssec-trust-anchors.d manual: https://www.freedesktop.org/software/systemd/man/dnssec-trust-anchors.d.html
- Ubuntu Server DNSSEC troubleshooting guide: https://ubuntu.com/server/docs/how-to/networking/dnssec-troubleshooting/
- Debian Wiki resolv.conf page: https://wiki.debian.org/resolv.conf
- Fedora systemd-resolved change proposal: https://fedoraproject.org/wiki/Changes/systemd-resolved
- RFC 4033, DNS Security Introduction and Requirements: https://datatracker.ietf.org/doc/html/rfc4033
- RFC 4034, Resource Records for DNSSEC: https://datatracker.ietf.org/doc/html/rfc4034
- RFC 4035, Protocol Modifications for DNSSEC: https://datatracker.ietf.org/doc/html/rfc4035
- RFC 7646, DNSSEC Negative Trust Anchors: https://datatracker.ietf.org/doc/html/rfc7646
- OneUptime monitor implementation in the local repository: `/home/simon-larsen/oneuptime/oneuptime/Common/Types/Monitor/MonitorType.ts`, `/home/simon-larsen/oneuptime/oneuptime/Probe/Utils/Monitors/Monitor.ts`

## Issues Found
1. The post incorrectly said systemd-resolved is the default DNS resolver on Debian 10+ and Arch Linux. Debian does not install systemd-resolved by default, and Arch requires explicit enablement. I changed the wording to say it is default on Ubuntu 18.04+ and Fedora 33+, and available on Debian and Arch.

2. The DNSSEC modes section incorrectly described `allow-downgrade` as the default and counted `true` as a separate mode. Current systemd documents `DNSSEC=` as a boolean or `allow-downgrade`, with the upstream default set to `no`. I changed the section to list three modes and mention boolean aliases separately.

3. The complete configuration example labeled `DNS=` entries as fallback DNS servers. In systemd-resolved, `DNS=` configures primary system DNS servers; `FallbackDNS=` is the fallback list. I corrected the comment.

4. The `dnssec-failed.org` expected error used `signature-expired`, but current Ubuntu systemd-resolved troubleshooting examples show this commonly fails with `no-signature`. I updated the example to avoid a misleading failure reason.

5. The troubleshooting command `systemd-analyze verify /etc/systemd/resolved.conf.d/*.conf` was wrong because `verify` checks unit files, not resolved.conf drop-ins. I replaced it with `systemd-analyze cat-config systemd/resolved.conf` for inspecting the merged configuration.

6. The networkd example used an inline comment after `UseDNS=no` in a systemd configuration file and used a generic `[DHCP]` section. Current systemd.network documents `[DHCPv4]` and `[DHCPv6]`; I split the setting into those sections and moved the comment to its own line.

7. The OneUptime YAML used an unsupported illustrative schema (`type: dns`, `dnssec_validation`, `dnssec_valid`). The local OneUptime implementation has a separate `DNSSEC` monitor type. I replaced the YAML with a UI-level DNSSEC monitor configuration.

8. The firewall rule comment claimed to allow DNS only through systemd-resolved, but the rules only block direct classic DNS on port 53 and do not cover DNS-over-TLS or DNS-over-HTTPS. I narrowed the comment to classic DNS traffic.

9. The Debian instructions only enabled systemd-resolved. Since Debian may not install it by default, I added `apt update` and `apt install systemd-resolved`.

## Review Notes
The remaining commands and configuration keys match current systemd 255 local man pages and upstream systemd documentation. Distribution defaults can still vary by downstream packaging, so readers should verify their active resolver with `systemctl status systemd-resolved` and `resolvectl status`.

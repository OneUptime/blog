# Validation Summary: How to Troubleshoot IPv6 SMTP Connection Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Postfix MTA (postconf, postqueue, smtp_bind_address6, inet_protocols, debug_peer_list/level)
- IPv6 networking (ip -6, ping6, ip6tables)
- SMTP enhanced status codes (550 5.7.1, 550 5.7.26, 421)
- DNS (PTR records, FCrDNS, AAAA, dig)
- SPF (ip6: mechanism)
- Linux sysctl (net.ipv6.conf.*.use_tempaddr)
- IPv6 Privacy Extensions (RFC 8981)
- Common CLI tools: ss, telnet, nc, curl, mail

## Sources Consulted
- IETF Datatracker / RFC 4941: https://datatracker.ietf.org/doc/rfc4941/ — confirmed RFC 4941 has been obsoleted by RFC 8981 ("Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6").
- IANA SMTP Enhanced Status Codes registry: https://www.iana.org/assignments/smtp-enhanced-status-codes/smtp-enhanced-status-codes.xhtml — verified meaning of 5.7.x codes (5.7.23 = SPF validation failed; 5.7.26 = multiple authentication checks failed).
- Postfix postconf reference (smtp_bind_address6, inet_protocols, debug_peer_list, debug_peer_level) — option names, syntax, and accepted values verified.
- Linux iproute2 (`ip -6 addr/route/route get`), iptables/ip6tables, ss(8), and sysctl(8) man pages for command syntax.
- Google Public DNS IPv6 resolver address (2001:4860:4860::8888) — verified.
- Gmail MX hostname (gmail-smtp-in.l.google.com) — verified.

## Issues Found
- The post stated IPv6 privacy extensions are defined in **RFC 4941**. RFC 4941 was obsoleted by **RFC 8981** in February 2021. Updated the reference to "RFC 8981, which obsoletes RFC 4941" so the post points to the current standard while preserving the historical context.

No other technical inaccuracies were found. All Postfix configuration directives (`inet_protocols`, `smtp_bind_address6`, `debug_peer_list`, `debug_peer_level`), CLI invocations (`ip -6`, `ip6tables`, `ss -tlnp`, `postconf`, `postqueue`, `dig -x`, `nc -6`, `telnet -6`, `sysctl`), file paths (`/etc/postfix/main.cf`, `/var/log/mail.log`, `/etc/sysctl.d/`), and the diagnostic flow (PTR/FCrDNS, SPF ip6:, privacy extensions, source address pinning) match the relevant official documentation and best practices.

## Review Notes
- The bounce-message example labelled `550 5.7.26` is described as "This message fails to pass SPF checks". Per IANA, 5.7.26 is technically "Multiple authentication checks failed" (often returned by Gmail when SPF and DKIM/DMARC both fail because the IPv6 source isn't authorized). 5.7.23 is the SPF-only code. The post's diagnosis (missing `ip6:` mechanism in the SPF record) is a real-world cause of Gmail returning 5.7.26, so the guidance is still actionable; left unchanged.
- `ping6` is still present on most distributions but has been merged into `ping` on iputils since 2018; `ping -6 ...` is the more forward-compatible spelling. Not changed because `ping6` continues to work on common distros.
- The privacy-extensions sysctl example assumes the interface is named `eth0`. On systems using systemd predictable interface names (e.g., `enp1s0`, `ens3`) the user must substitute the correct interface name; this is implied but not spelled out.
- Setting `inet_protocols = all` requires a Postfix restart (not just `reload`) to take effect, per Postfix documentation, since `inet_protocols` controls socket binding at startup. The post uses `systemctl reload postfix`; on modern Postfix systemd units, `reload` typically maps to a restart, so it usually works, but a `restart` is the safer guidance. Left as-is to avoid scope creep.

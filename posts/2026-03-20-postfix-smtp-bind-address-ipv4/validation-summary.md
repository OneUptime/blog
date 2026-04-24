# Validation Summary: How to Configure Postfix smtp_bind_address for IPv4 Outbound Mail

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- SMTP
- DNS/SPF
- Linux mail delivery commands and logging

## Sources Consulted
- Postfix configuration parameters (`smtp_bind_address`, `smtp_bind_address6`, `inet_protocols`, `smtp_address_preference`): https://www.postfix.org/postconf.5.html
- Postfix `master.cf` service override syntax: https://www.postfix.org/master.5.html
- Postfix transport table syntax: https://www.postfix.org/transport.5.html
- Postfix control commands: https://www.postfix.org/postfix.1.html
- Postfix `sendmail` compatibility interface: https://www.postfix.org/sendmail.1.html
- RFC 7208, Sender Policy Framework (SPF): https://datatracker.ietf.org/doc/html/rfc7208

## Issues Found
- The post said `smtp_bind_address6 =` disables IPv6 sending. I corrected this because an empty value means no explicit IPv6 source bind; it does not disable IPv6 delivery.
- The post recommended `inet_protocols = ipv4` in `main.cf` for outbound-only IPv4 delivery. I corrected this to a `master.cf` override on the SMTP client service because `inet_protocols` in `main.cf` affects both incoming and outgoing protocol support.
- The per-destination `master.cf` examples only set `smtp_bind_address`. I added `-o inet_protocols=ipv4` so those custom transports stay on IPv4 on dual-stack hosts.
- The `telnet` test did not validate Postfix outbound binding because it created a manual SMTP session from the shell instead of exercising Postfix's SMTP client. I replaced it with a Postfix-driven test using `sendmail`, queue flushing, and log/header inspection.
- The SPF explanation said the record must include the literal `smtp_bind_address` IP. I corrected this to say the SPF policy must authorize that IP, because SPF authorization can be expressed with `ip4`, `a`, and other mechanisms.

## Review Notes
- The examples use `eth0` and `/var/log/mail.log`, which are common Linux examples but can vary by distribution and interface naming.

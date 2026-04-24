# Validation Summary: How to Configure Postfix smtp_address_preference for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- SMTP
- IPv4 / IPv6 dual-stack mail delivery
- Postfix `main.cf`
- Postfix `master.cf`
- Postfix transport maps
- `postconf`
- `postmap`
- `sendmail`

## Sources Consulted
- Postfix `postconf(5)` parameter reference: https://www.postfix.org/postconf.5.html
- Postfix `postconf(1)` command reference: https://www.postfix.org/postconf.1.html
- Postfix `transport(5)` table format reference: https://www.postfix.org/transport.5.html
- Postfix `sendmail(1)` compatibility interface reference: https://www.postfix.org/sendmail.1.html
- Postfix IPv6 support notes: https://www.postfix.org/IPV6_README.html

## Issues Found
1. The value table incorrectly said `smtp_address_preference = any` tries IPv6 first and described `ipv4`/`ipv6` as unconditional preferences. Postfix documents this parameter as affecting which family is tried first only when IPv4 and IPv6 addresses have equal MX preference, and `any` is the default. The introduction, description, and value table were corrected.
2. The post recommended `smtp_address_preference = ipv6` for production use and presented `smtp_address_preference = ipv4` as a safer transition setting. Postfix upstream explicitly documents both `ipv6` and `ipv4` as unsafe on dual-stack systems because an outage in the preferred family delays deliveries even when the other family still works. Those recommendations and the conclusion were corrected, and `any` was identified as the safe default.
3. The examples used `systemctl reload postfix` after changing `smtp_address_preference`. Postfix documents that this parameter requires a stop/start when changed, so the commands were updated to use `systemctl restart postfix`.
4. The selective-routing section implied that transport maps alone are the general mechanism for forcing IPv4/IPv6 delivery. Postfix’s documented solution for selective IPv4-only delivery is to use a dedicated transport with `-o inet_protocols=ipv4` and then route domains to that transport. The example was updated to show that supported pattern.
5. The `postconf -e` examples used spaced `parameter = value` syntax. `postconf(1)` documents the command-line form as `parameter=value`, so the commands were normalized to the canonical syntax.
6. The log inspection and monitoring examples were loosely aligned with failure-oriented `connect to` lines rather than the `relay=` form typically seen for successful deliveries. The examples were updated so the grep patterns and sample log line match a real delivery path more closely.

## Review Notes
- `/var/log/mail.log` is a Debian/Ubuntu-style log path. On other Linux distributions, equivalent Postfix logs may appear in `/var/log/maillog` or in `journalctl`.
- The post now correctly notes that `smtp_balance_inet_protocols = yes` is the default on Postfix 3.3 and later; earlier versions do not have that balancing behavior.

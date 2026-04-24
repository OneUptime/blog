# Validation Summary: How to Troubleshoot Postfix Not Sending Over IPv4 When IPv6 Fails

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- SMTP
- IPv4
- IPv6
- DNS MX resolution

## Sources Consulted
- Postfix `postconf(5)`: https://www.postfix.org/postconf.5.html
- Postfix `postfix(1)`: https://www.postfix.org/postfix.1.html
- Postfix `postqueue(1)`: https://www.postfix.org/postqueue.1.html
- Postfix `postcat(1)`: https://www.postfix.org/postcat.1.html
- Postfix `transport(5)`: https://www.postfix.org/transport.5.html
- Postfix `sendmail(1)`: https://www.postfix.org/sendmail.1.html
- RFC 5321, Section 5 (Address Resolution and Mail Handling): https://www.rfc-editor.org/rfc/rfc5321

## Issues Found
- The introduction overstated Postfix behavior by saying it may generally fail to fall back to IPv4 and queue mail indefinitely. I corrected this to reflect Postfix documentation: delivery may be delayed, and older versions or IPv6-first settings are the cases that can leave mail deferred.
- The post said changing `inet_protocols` could be applied with `postfix reload`. Postfix documents that `inet_protocols` changes require a stop/start, so I replaced `reload` with `postfix stop` and `postfix start`.
- The connectivity examples used `smtp.gmail.com`, which is a submission host and not the MX target used for normal delivery to `gmail.com`. I changed the examples to look up a recipient-domain MX host first and test that host over IPv4 and IPv6.
- The `smtp_address_preference = ipv4` advice was incorrect as a general fix, and the accompanying `dig` commands were also incorrect. I replaced this with a read-only check of `smtp_address_preference` and `smtp_balance_inet_protocols`, plus correct A/AAAA lookups for the MX host. I also aligned the text with Postfix guidance that `smtp_address_preference = any` with `smtp_balance_inet_protocols = yes` is the safe setting when both protocols stay enabled.
- The debug example targeted `smtp.gmail.com`, which would not match the actual remote MX used for delivery to Gmail recipients, and it relied on the generic `mail` utility. I updated it to derive an MX host and use Postfix's `sendmail -v` interface for the test submission.
- The transport-map example was incomplete because it did not enable `transport_maps` in `main.cf`. I added `transport_maps = hash:/etc/postfix/transport`, changed the indexing command to `postmap hash:/etc/postfix/transport`, and removed the unnecessary `smtp_bind_address` line from the custom transport service.

## Review Notes
- The post now matches current Postfix documentation, including the documented requirement to restart Postfix after changing `inet_protocols`.
- The log path `/var/log/mail.log` is common on Debian/Ubuntu systems but is distro-specific; some environments expose Postfix logs through other syslog paths or `journalctl`.
- Postfix documents `smtp_address_preference = any` with `smtp_balance_inet_protocols = yes` as the safe dual-stack default. Older Postfix behavior can be worse during single-protocol outages, which is why the revised post now qualifies that point.

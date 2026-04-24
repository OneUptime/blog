# Validation Summary: How to Force Postfix to Use IPv4 Only with inet_protocols = ipv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- SMTP
- IPv4
- IPv6
- Linux networking tools
- Swaks

## Sources Consulted
- Postfix `postconf(5)`: https://www.postfix.org/postconf.5.html
- Postfix IPv6 README: https://www.postfix.org/IPV6_README.html
- Postfix `postfix(1)`: https://www.postfix.org/postfix.1.html
- Postfix `sendmail(1)`: https://www.postfix.org/sendmail.1.html
- Postfix Basic Configuration README: https://www.postfix.org/BASIC_CONFIGURATION_README.html
- RFC 1035: https://www.rfc-editor.org/rfc/rfc1035
- RFC 5321: https://www.ietf.org/rfc/rfc5321.html
- Swaks project documentation: https://www.jetmore.org/john/code/swaks/
- Local CLI help: `ss --help`
- Local CLI help: `grep --help`

## Issues Found
- The post said to apply `inet_protocols` changes with `postfix reload`. Postfix documents that `inet_protocols` changes require a full stop/start, so the commands were changed to `postfix stop` and `postfix start`.
- The `all` row in the `inet_protocols` table overstated behavior. Postfix documents `all` as IPv4 plus IPv6 if the operating system supports IPv6, so the wording was corrected.
- The line about "skip IPv6 MX records" was inaccurate. MX records point to hostnames; Postfix then looks up A and/or AAAA records for those hosts. The wording was corrected to AAAA lookups for MX hosts.
- The "SPF alignment" comment was technically incorrect. `myhostname` does not define SPF alignment, so the misleading comment was removed and replaced with an accurate description of `myhostname`.
- The outbound address pinning example implied `smtp_bind_address` and `inet_interfaces` should always be paired with `inet_protocols`. Postfix documents these as optional and potentially problematic on multi-homed systems, so the wording was corrected to make them optional.
- The `mail` example depended on an external mail client rather than Postfix itself. It was replaced with a Postfix `sendmail` example that is documented by Postfix and works with the local MTA interface.
- The log-filter command only excluded some IPv6 forms and could miss valid IPv6 addresses. It was changed to positively match bracketed IPv4 literals instead.
- The `swaks` example was accurate, but it depends on an external tool. The text was adjusted to mark it as optional.

## Review Notes
- The post is still technically relevant and current for modern Postfix releases, including current 3.x documentation.
- `/var/log/mail.log` is common on Debian/Ubuntu systems; some other distributions log Postfix mail to `/var/log/maillog` instead.

# Validation Summary: How to Configure Postfix smtp_bind_address6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- IPv6
- SMTP
- DNS PTR records
- SPF
- `tcpdump`

## Sources Consulted
- Postfix `postconf(5)` manual: https://www.postfix.org/postconf.5.html
- Postfix IPv6 support documentation: https://www.postfix.org/IPV6_README.html
- Postfix `smtp(8)` / `lmtp(8)` manual: https://www.postfix.org/smtp.8.html
- Postfix `sendmail(1)` manual: https://www.postfix.org/sendmail.1.html
- Postfix `postconf(1)` manual: https://www.postfix.org/postconf.1.html
- Postfix `postfix(1)` manual: https://www.postfix.org/postfix.1.html
- Postfix DEBUG_README: https://www.postfix.org/DEBUG_README.html
- Postfix multiple-instance documentation: https://www.postfix.org/MULTI_INSTANCE_README.html
- RFC 7208, Sender Policy Framework (SPF): https://www.rfc-editor.org/rfc/rfc7208
- Local command help output checked for syntax: `ip address help`, `dig -h`, `tcpdump -h`

## Issues Found
- The introduction implied Postfix picks a source IPv6 address arbitrarily. Postfix documents that when `smtp_bind_address6` is unset, the SMTP client uses a system-chosen source address unless other settings such as `inet_interfaces` constrain it. I corrected the wording so it no longer describes the behavior as random.
- The post said to reload Postfix after changing `smtp_bind_address6`. Postfix documents that this parameter requires a full stop/start when changed, so I updated the commands to restart Postfix instead of reloading it.
- The verification example used the external `mail` utility and showed a log line format that is not standard Postfix evidence for the bound local IPv6 address. I replaced that with Postfix's native `sendmail` interface and a `tcpdump` example, which matches Postfix's debugging guidance for validating SMTP connections on the wire.
- The PTR lookup comment incorrectly said `dig -x` needs the IPv6 address in reverse notation. `dig -x` accepts the normal address form and performs the reverse lookup automatically, so I fixed that comment.
- The hostname verification command used `postconf myhostname` but expected value-only output. Postfix documents `postconf -h` for printing only the parameter value, so I changed the command to `postconf -h myhostname`.
- The reset section said clearing `smtp_bind_address6` reverts to OS-chosen source selection. Postfix documents that clearing the parameter removes the explicit bind, but `inet_interfaces` can still implicitly constrain the source address. I corrected the text to say it returns to Postfix defaults.
- The IPv4 fallback troubleshooting advice implied that setting `smtp_address_preference` to `ipv6` or `any` is the main fix. Postfix documents that `smtp_bind_address6` applies only to IPv6 SMTP connections, so the destination must have reachable AAAA records and `inet_protocols` must include IPv6. I rewrote the note to reflect the actual decision path.
- The `Cannot assign requested address` note implied that a bind failure always stops delivery. Postfix 3.7 and later add `smtp_bind_address_enforce`; by default Postfix logs a warning and continues delivery. I added that version-specific caveat.

## Review Notes
- `smtp_bind_address6` is available in Postfix 2.2 and later. The `smtp_bind_address_enforce` parameter mentioned in the corrected troubleshooting note is available only in Postfix 3.7 and later.
- PTR and SPF checks are operational deliverability practices performed by receiving systems, not strict SMTP protocol requirements. The post's framing is still appropriate for a practical mail-admin guide.

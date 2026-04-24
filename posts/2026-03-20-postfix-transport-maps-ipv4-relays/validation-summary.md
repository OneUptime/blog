# Validation Summary: How to Configure Postfix Transport Maps to Route Mail via IPv4 Relays

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- Postfix transport maps
- SMTP relaying
- IPv4 mail delivery
- Postfix SASL client authentication
- Postfix TLS client settings

## Sources Consulted
- Postfix `transport(5)` manual: https://www.postfix.org/transport.5.html
- Postfix `postconf(5)` manual: https://www.postfix.org/postconf.5.html
- Postfix IPv6 support documentation: https://www.postfix.org/IPV6_README.html
- Postfix SASL Howto: https://www.postfix.org/SASL_README.html

## Issues Found
- The transport map format was written as `<transport>:[<nexthop>]`, but Postfix documents the result format as `transport:nexthop`; square brackets are only needed when you want the SMTP client to skip MX lookups or when using a literal IP address. I corrected the format line to match the documented syntax.
- The example `internal.example.com  smtp:[127.0.0.1]:25` was described as local routing without a relay override, but that actually routes via SMTP to loopback and can change delivery behavior. Postfix documents `:` as the null transport/null nexthop form for leaving normal routing unchanged, so I replaced that example with `internal.example.com  :`.
- The `postmap` commands were inconsistent with `transport_maps = hash:/etc/postfix/transport` and `smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd`. Postfix documents that `postmap /path` builds the default database type unless you specify `type:/path`, so I changed both commands to `postmap hash:/...` to match the configured backend explicitly.
- The post said to reload Postfix after setting `inet_protocols = ipv4`, but Postfix’s IPv6 documentation requires a full stop/start when `inet_protocols` changes. I changed the step to restart Postfix instead of reloading it.
- The SASL example used `smtp_sasl_security_options = noanonymous`, while Postfix’s SASL client example documents `smtp_sasl_tls_security_options = noanonymous` together with `smtp_tls_security_level = encrypt` so plaintext-capable mechanisms are allowed only after TLS is active. I updated the parameter accordingly.
- The test comment said it used `mailq` and `sendmail`, but only `sendmail` was shown. I corrected the comment to match the command.

## Review Notes
- The `*` transport-table entry is valid in Postfix transport maps and acts as a wildcard catch-all.
- `inet_protocols = ipv4` is a global Postfix setting, so it affects all Postfix network connections, not just one relay destination.
- `smtp_tls_security_level = encrypt` requires the authenticated relay to support TLS; otherwise delivery will be deferred until a TLS-capable next hop is available.

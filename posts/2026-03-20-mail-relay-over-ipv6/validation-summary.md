# Validation Summary: How to Configure Mail Relay over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- IPv6
- SMTP and message submission
- Python `smtplib`
- `swaks`
- `nc` (netcat)
- `ip6tables`

## Sources Consulted
- Postfix IPv6 Support: https://www.postfix.org/IPV6_README.html
- Postfix `postconf(1)`: https://www.postfix.org/postconf.1.html
- Postfix `postconf(5)`: https://www.postfix.org/postconf.5.html
- Postfix SASL Howto: https://www.postfix.org/SASL_README.html
- Postfix TLS Support: https://www.postfix.org/TLS_README.html
- Postfix `master(5)`: https://www.postfix.org/master.5.html
- Python `smtplib` documentation: https://docs.python.org/3/library/smtplib.html
- Swaks official documentation homepage: https://jetmore.org/john/code/swaks/
- Local command help for `nc` and `ip6tables`

## Issues Found
- The `mynetworks` IPv6 example used the wrong Postfix match-list syntax: it had `[2001:db8::/32]` instead of `[2001:db8::]/32`. I corrected it to match Postfix's IPv6 documentation.
- The relay-server comment on `relayhost =` was misleading. An empty `relayhost` does not configure another relay; it leaves Postfix doing direct delivery to recipient MX hosts. I corrected the comment.
- The `submission` service entry used a chrooted `master.cf` service definition (`y`) even though current Postfix documentation defaults services to non-chrooted (`n`) on modern versions. I updated the example to the current default form for a generic setup.
- The submission example used `smtpd_recipient_restrictions` for relay authorization. Current Postfix documentation prefers `smtpd_relay_restrictions` for relay policy, so I updated the example accordingly.
- The post used `systemctl reload postfix` after changing `inet_protocols`. Postfix's IPv6 documentation says `inet_protocols` changes require a stop/start or restart, so I changed those commands to `systemctl restart postfix`.
- The client example ran `postmap /etc/postfix/sasl_passwd` even though the configuration explicitly used `hash:/etc/postfix/sasl_passwd`. I changed the command to `postmap hash:/etc/postfix/sasl_passwd` to match the configured map type.
- The Python example incorrectly implied that `smtplib.SMTP()` uses SMTP-style bracketed IPv6 literals. It does not; the host and port are passed separately. I corrected the comment and added the recommended `ehlo()` call after `starttls()` per the Python documentation.

## Review Notes
- The example IPv6 addresses under `2001:db8::/32` are documentation-only addresses, which is appropriate for a tutorial.
- The firewall export example writes rules to `/etc/ip6tables.rules`, but whether those rules are restored automatically at boot remains distro-specific.

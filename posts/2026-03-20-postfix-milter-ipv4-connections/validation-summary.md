# Validation Summary: How to Configure Postfix milter for IPv4 Connections

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- Milters / libmilter-compatible filters
- OpenDKIM
- SpamAssassin
- spamass-milter
- Linux mail service administration commands

## Sources Consulted
- Postfix MILTER_README: https://www.postfix.org/MILTER_README.html
- Postfix `postconf(5)`: https://www.postfix.com/postconf.5.html
- OpenDKIM `opendkim.conf(5)`: https://www.opendkim.org/opendkim.conf.5.html
- Debian `spamass-milter(1)`: https://manpages.debian.org/testing/spamass-milter/spamass-milter.1.en.html
- Debian `spamass-milter` `README.Debian`: https://sources.debian.org/data/main/s/spamass-milter/0.4.0-5/debian/README.Debian
- Debian `spamass-milter.default`: https://sources.debian.org/data/main/s/spamass-milter/0.4.0-5/debian/spamass-milter.default
- Apache SpamAssassin `spamc` documentation: https://spamassassin.apache.org/full/3.2.x/doc/spamc.html
- Apache SpamAssassin `README.spamd`: https://apache.googlesource.com/spamassassin/+/b2_4_0/spamd/README.spamd

## Issues Found
- The post mixed Postfix endpoint syntax with milter-daemon socket syntax. I updated the explanation and examples so Postfix uses `inet:host:port`, while noting that milter daemons commonly listen with `inet:port@host`.
- The OpenDKIM example used a literal IPv4 address without brackets. I changed `Socket inet:12301@127.0.0.1` to `Socket inet:12301@[127.0.0.1]` to match `opendkim.conf(5)`.
- The `spamass-milter` example incorrectly reused port `783` for the milter listener even though `783` is the default `spamd` port. I changed the milter listener to `12302` and updated the Postfix chain accordingly.
- The `spamass-milter` example passed `-- -u spamd -d localhost`, which misused `spamc`'s `-u` flag. I replaced it with valid backend connection options `-- -d 127.0.0.1 -p 783`.
- The Debian package documentation requires `SOCKETMODE=""` and `SOCKETOWNER=""` when `spamass-milter` is configured with an inet socket, so I added those lines to the example.

## Review Notes
- `inet_protocols = ipv4` is technically valid for an IPv4-only Postfix setup, but it is a global Postfix setting rather than a milter-specific requirement.
- The post is validated after the corrections above. I did not runtime-test the mail stack in this workspace; validation was done against upstream and package documentation.

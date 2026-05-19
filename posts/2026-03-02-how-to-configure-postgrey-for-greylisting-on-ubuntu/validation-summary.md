# Validation Summary: How to Configure Postgrey for Greylisting on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Postgrey
- Postfix
- SMTP greylisting
- Berkeley DB
- systemd

## Sources Consulted
- Ubuntu Manpage: postgrey(8) - https://manpages.ubuntu.com/manpages/stonking/man8/postgrey.8.html
- Debian Sources: postgrey default configuration - https://sources.debian.org/src/postgrey/1.37-2.2/debian/postgrey-default/
- Debian Sources: postgrey systemd unit - https://sources.debian.org/src/postgrey/1.37-2.2/debian/postgrey.service/
- Postfix SMTP Access Policy Delegation - https://www.postfix.org/SMTPD_POLICY_README.html
- Ubuntu Community Help Wiki: PostfixGreylisting - https://help.ubuntu.com/community/PostfixGreylisting
- RFC 5321: Simple Mail Transfer Protocol - https://www.rfc-editor.org/rfc/rfc5321
- Local Ubuntu apt metadata for postgrey 1.37-2 and extracted package files from the Ubuntu Noble package

## Issues Found
- The post said Ubuntu Postgrey defaults to a Unix socket or TCP port 10023. Ubuntu's packaged default is `POSTGREY_OPTS="--inet=10023"`, so I changed the text to say TCP 10023 is the default and the Unix socket is an optional local configuration.
- The greylisting explanation referred to a fixed `451` response and implied the second attempt is always accepted. Postgrey's default greylist action is `DEFER_IF_PERMIT`, and acceptance depends on retrying after the delay, so I changed the wording to "temporary rejection" and "a later attempt is accepted after the greylist delay."
- The post described future accepted mail as lasting for a "whitelist TTL." Postgrey uses the `--max-age` setting for triplet expiry, so I changed the wording to reference max-age.
- The `--retry-window=2d` example was invalid. Postgrey accepts a number of days such as `2`, or hours with an `h` suffix such as `48h`, so I changed it to `--retry-window=2` and corrected the comment.
- The Postfix integration note said to place the policy check before rejecting unknown users. Postfix documentation recommends doing relay checks first and also rejecting unknown recipients before greylisting to avoid database pollution, so I corrected the placement guidance.
- The post used `postgrey-stat --status`, but Ubuntu's postgrey package does not ship `postgrey-stat`. I replaced that example with `db_dump` against the Postgrey database.
- The whitelist examples appended to package-managed whitelist files. Postgrey reads `.local` whitelist files by default for local entries, so I changed the examples to use `whitelist_clients.local` and `whitelist_recipients.local`.
- The post presented `--lookup-by-subnet` as something to add for busy servers. Postgrey's manpage states subnet lookup is the default, with `/24` for IPv4 and `/64` for IPv6, so I changed the example to optional explicit `--ipv4cidr` and `--ipv6cidr` settings.
- The database cleanup examples used a nonexistent `--cleanup` option. Postgrey handles cleanup based on `--max-age`, so I replaced the invalid commands with a valid shorter-retention example.
- The monitoring examples referenced `/var/log/postgrey.log`, which is not the default Ubuntu log target. I changed those examples to use `/var/log/mail.log` and journalctl.
- The post used `systemctl reload postgrey`, but the packaged systemd unit has no `ExecReload`. Since Postgrey reloads whitelists on SIGHUP, I changed the examples to `systemctl kill -s HUP postgrey`.
- The database paths `/var/lib/postgrey/db` and `/var/lib/postgrey/db_whitelisted` were incorrect. The package uses `postgrey.db` and `postgrey_clients.db`, so I corrected the `db_dump` commands.

## Review Notes
The tutorial is technically relevant and salvageable. The remaining percentage claim about typical spam reduction is broad and environment-dependent, but it is framed as a typical outcome rather than an exact guarantee.

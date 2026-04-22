# Validation Summary: How to Configure Sendmail for IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Sendmail 8 configuration with M4 `.mc` files and generated `sendmail.cf`
- IPv6 listener configuration with `DAEMON_OPTIONS` / `DaemonPortOptions`
- Outbound SMTP source binding with `CLIENT_OPTIONS` / `ClientPortOptions`
- Sendmail access database (`access.db`) and `makemap`
- Linux service, socket, and SMTP testing commands

## Sources Consulted
- Sendmail official cf/README, "Tweaking Configuration Options": https://www.sendmail.org/~ca/email/doc8.12/cf/m4/tweaking_config.html
- Sendmail official cf/README, "Anti-Spam Configuration Control": https://www.sendmail.org/~ca/email/doc8.12/cf/m4/anti_spam.html
- Sendmail official Installation and Operation Guide, configuration options: https://www.sendmail.org/~ca/email/doc8.12/op-sh-5.html
- Debian Sendmail README for packaged IPv6 examples: https://sources.debian.org/src/sendmail/8.17.1.9-2%2Bdeb12u2/debian/sendmail.README.Debian
- Debian `sendmailconfig(8)` man page: https://manpages.debian.org/bookworm/sendmail-base/sendmailconfig.8.en.html
- Debian `sendmail-cf` package details: https://packages.debian.org/bookworm/sendmail-cf
- Local `ss --help` and `telnet --help` output for command flag validation.

## Issues Found
- The description referred to "address class settings", but the post actually configures the access map. Changed it to "access map settings."
- The MSA examples added explicit submission listeners without disabling Sendmail's default MSA listener. Added ``FEATURE(`no_default_msa')`` before the explicit `DAEMON_OPTIONS` examples.
- The direct compile command used `sudo m4 ... > /etc/mail/sendmail.cf`, where the shell redirection would not run under `sudo`. Changed it to `sudo sh -c 'm4 /etc/mail/sendmail.mc > /etc/mail/sendmail.cf'`.
- The `cd /etc/mail; sudo make` sequence was replaced with `sudo make -C /etc/mail` so the command works as a standalone copyable line.
- The IPv6 access map loopback entry used `IPv6:1`, which does not represent `::1`. Changed it to `IPv6:::1`.
- The IPv6 prefix example used a trailing-colon key. Changed it to the documented Sendmail access-map prefix style, `IPv6:2001:db8`.
- The access map section did not mention that ``FEATURE(`access_db')`` must be enabled. Added that prerequisite inline.
- The outbound `CLIENT_OPTIONS` text claimed the setting makes Sendmail prefer IPv6 and used `Address=...`. Changed the wording to source-address binding and used the documented `Addr=...` key.
- The log-check example only showed the RHEL/CentOS log path. Added the Debian/Ubuntu `/var/log/mail.log` path.
- The compiled-config verification referenced a non-existent `IPv6_full` feature and `confNET_ADDR` parameter. Replaced it with checks for generated `DaemonPortOptions` / `ClientPortOptions` entries and `ResolverOptions`.
- The troubleshooting validation command piped M4 output through `grep`, which is not a reliable `.mc` validation method. Replaced it with generating a test `.cf` file and checking command output.

## Review Notes
- The `M=Ea` submission examples are valid Sendmail modifiers, but `a` requires SMTP AUTH; deployments using those lines must have AUTH configured separately.
- Sendmail behavior around dual-stack wildcard sockets can vary by OS and kernel settings, so checking actual listeners with `ss` after restart remains necessary.

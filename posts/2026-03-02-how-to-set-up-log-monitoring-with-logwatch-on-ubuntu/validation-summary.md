# Validation Summary: How to Set Up Log Monitoring with Logwatch on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Logwatch 7.7 (Ubuntu 24.04 package version `7.7-1ubuntu1`)
- Postfix MTA
- cron / crontab
- logrotate
- Perl (for custom service filter scripting)
- Ubuntu (apt package management)

## Sources Consulted
- Ubuntu `logwatch` package (`7.7-1ubuntu1`) — inspected the installed `/usr/sbin/logwatch` Perl script and `/usr/share/logwatch/default.conf/logwatch.conf` to verify directive names, config-file parsing behaviour, available variables, and CLI options.
- Upstream Logwatch project: https://sourceforge.net/projects/logwatch/ and https://github.com/logwatch/logwatch
- `man 5 crontab` — verified percent-sign (`%`) escaping rules in cron commands.
- Postfix documentation for `relayhost`, SASL, and TLS smtp settings: https://www.postfix.org/postconf.5.html

## Issues Found

1. **Misleading `LogFile` comment in basic config** — The original sample claimed `LogFile = /var/log/logwatch` controlled "logwatch's own log". In reality, `LogFile` in `logwatch.conf` restricts logwatch to analysing one specific input log; it has nothing to do with writing logwatch's own output. Removed the misleading entry and clarified the `mailer` comment.

2. **`override.conf` section used invalid config** — The post created `/etc/logwatch/conf/override.conf` and wrote `MailSubject = "[$(hostname)] Logwatch Report for $date$"` and `MailFrom = "logwatch@$(hostname -f)"`. Three problems:
   - `override.conf` is loaded with a prefix (`logwatch: key = value`); plain key/value lines without the prefix are silently ignored.
   - The recognised directive is `subject` (lowercase), not `MailSubject` — Logwatch 7.7 never reads a key called `mailsubject`.
   - Logwatch config files do not execute shell, so `$(hostname)` and `$(hostname -f)` are stored literally and end up verbatim in the email headers. The default subject line includes the hostname automatically; there are no `$HostName`/`$Date` variables substituted in the `subject` value (the script comment even says: "This does not allow for variable expansion").
   - Rewrote the section to (a) edit `logwatch.conf` directly, (b) use the correct `subject` directive with a literal string, and (c) show how to inject dynamic values like the hostname via `--subject` on the cron command line where the shell *will* expand them.

3. **Unescaped `%` in cron entry** — The cron snippet for daily archives used `$(date +%Y-%m-%d)`. Per `man 5 crontab`, unescaped `%` in a crontab command is converted to a newline, truncating the command. Fixed to use `\%Y-\%m-\%d` and put the entire command on a single line (the original used a backslash line-continuation, which is not guaranteed across cron implementations and is unnecessary here).

4. **Stale version in illustrative report header** — The sample report header showed `Logwatch 7.6 (01/22/21)`. Ubuntu's current package ships Logwatch 7.7 (released 07/22/22), so users following along would see a different version banner. Updated to `7.7 (07/22/22)` to match what readers will actually observe.

## Review Notes

- The Perl custom-filter example is syntactically valid and follows the conventional structure of upstream filter scripts in `/usr/share/logwatch/scripts/services/`. The companion `services/myapp.conf` (with `Title` and `LogFile`) and `logfiles/myapp.conf` (with `LogFile`/`Archive`) layout is correct.
- `Service = "-zz-network"` and `Service = "-zz-sys"` are valid exclusion entries — they match real built-in filters shipped with the package and appear (commented) in upstream `default.conf`.
- `nginx` is mentioned as a possible service; there is no `nginx` filter shipped in the upstream package (no `/usr/share/logwatch/scripts/services/nginx`). The troubleshooting section already addresses this by telling readers to check `/usr/share/logwatch/scripts/services/` for the filter — accurate, but readers should know they may need a third-party filter or to write their own for nginx.
- The Postfix SASL/TLS relay example uses standard, current Postfix parameters and is correct.
- The `Detail` levels (`Low`/`Med`/`High` mapping to `0`/`5`/`10`) match upstream `default.conf` comments.
- `/etc/cron.daily/00logwatch` is the correct path for the package's auto-installed daily job, and the ~06:25 default time reflects standard Ubuntu cron behaviour (`/etc/crontab` runs `cron.daily` at 06:25 when anacron is not active).

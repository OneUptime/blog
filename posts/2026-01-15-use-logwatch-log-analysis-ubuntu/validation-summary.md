# Validation Summary: How to Use Logwatch for Log Analysis on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- Linux system logs
- Logwatch
- Cron
- Postfix and mail delivery
- Perl service filters
- Shell scripting

## Sources Consulted
- Ubuntu Server documentation: https://ubuntu.com/server/docs/how-to/observability/install-logwatch/
- Ubuntu 24.04 Logwatch man page: https://manpages.ubuntu.com/manpages/noble/man8/logwatch.8.html
- Upstream Logwatch customization HOWTO: https://github.com/TheApacheCats/logwatch/blob/master/HOWTO-Customize-LogWatch
- Ubuntu package metadata for `logwatch` 7.7-1ubuntu1 via `apt-cache show logwatch` and extracted package contents.

## Issues Found
- The Postfix installation example did not install `mailutils`, but the article later uses the `mail -s` command for test messages. Added `mailutils` to the install command.
- The detail-level table described ranges for `Low`, `Med`, and `High`, but Logwatch maps those named levels to `0`, `5`, and `10`. Updated the table to match the Logwatch man page and default configuration.
- The configuration examples described comma-separated service and email recipient lists, but Logwatch treats `Service` as a cumulative repeated option and splits multiple `MailTo` recipients on spaces. Updated those comments and examples.
- The custom log file definition wrote to `/etc/logwatch/conf/logfiles/myapp.conf` without first creating `/etc/logwatch/conf/logfiles`. Added the missing `mkdir -p` command.
- The custom log file group did not apply date filtering for the article's bracketed timestamp example. Added an `*ApplyStdDate` line matching `[YYYY-MM-DD HH:MM:SS]` timestamps.
- The custom service configuration used `*OnlyContains`, which is not a Logwatch shared script in the Ubuntu package, and `*OnlyService` would filter syslog-style service names before the custom parser. Removed those lines so the Perl parser handles filtering.
- The email subject customization example pointed to `/etc/logwatch/conf/header.txt`, which is not the documented way to set an email subject. Replaced it with Logwatch's `--subject` option.
- The custom daily cron script computed `HOSTNAME` but did not use it. Added `--subject "Logwatch for $HOSTNAME"` using Logwatch's documented `--subject` option.
- The text report archive example wrote to `/var/log/logwatch/...` before creating the directory. Moved the directory creation before the file output command.

## Review Notes
- The article is technically relevant and broadly accurate for Ubuntu 20.04, 22.04, and 24.04. Logwatch service availability and exact log file coverage can still vary by installed packages and local syslog/journald configuration.

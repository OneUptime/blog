# Validation Summary: How to Configure ClamAV Milter with Postfix on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- ClamAV
- clamd
- freshclam
- clamav-milter
- Postfix milters
- EICAR antivirus test file
- swaks

## Sources Consulted
- ClamAV official configuration documentation: https://docs.clamav.net/manual/Usage/Configuration.html
- Ubuntu manpage for clamav-milter: https://manpages.ubuntu.com/manpages/questing/man8/clamav-milter.8.html
- Ubuntu manpage for clamav-milter.conf: https://manpages.ubuntu.com/manpages/questing/man5/clamav-milter.conf.5.html
- Ubuntu manpage for clamd.conf: https://manpages.ubuntu.com/manpages/questing/man5/clamd.conf.5.html
- Ubuntu manpage for freshclam.conf: https://manpages.ubuntu.com/manpages/questing/man5/freshclam.conf.5.html
- Postfix MILTER_README: https://www.postfix.org/MILTER_README.html
- Debian ClamAV clamav-milter.conf.sample source package reference: https://sources.debian.org/src/clamav/1.4.3%2Bdfsg-1/etc/clamav-milter.conf.sample
- Ubuntu Launchpad package page for clamav-unofficial-sigs: https://launchpad.net/ubuntu/noble/+package/clamav-unofficial-sigs

## Issues Found
- Corrected the `MaxScanSize` comment. The ClamAV `clamd.conf` option limits the total amount of data scanned for each input file, including archive/container expansion, not just the maximum size of files inside archives.
- Corrected the `AlertEncrypted no` comment. With `no`, ClamAV does not flag encrypted archives and documents as threats by default, so the previous "Alert on encrypted archives" wording contradicted the configured value.
- Corrected the stated default for `MaxThreads` from 12 to 10 to match the current Ubuntu `clamd.conf(5)` manpage.

## Review Notes
The guide's main Postfix milter socket syntax, `clamav-milter.conf` options, `freshclam.conf` update frequency setting, service commands, and EICAR test usage are technically valid. The configuration intentionally uses fail-open behavior (`OnFail Accept` and `milter_default_action = accept`), which is operationally common but should be reviewed against the site's mail security policy.

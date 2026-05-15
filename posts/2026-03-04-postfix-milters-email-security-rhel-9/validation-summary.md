# Validation Summary: How to Configure Postfix Milters for Email Security on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- RHEL 9
- Postfix
- Sendmail Milter protocol
- OpenDKIM
- OpenDMARC
- ClamAV milter
- SpamAssassin and spamass-milter
- systemd

## Sources Consulted
- Postfix MILTER_README: https://www.postfix.org/MILTER_README.html
- Postfix postconf(5), milter configuration parameters: https://www.postfix.org/postconf.5.html
- OpenDKIM opendkim(8): https://www.opendkim.org/opendkim.8.html
- OpenDMARC opendmarc.conf(5): https://manpages.debian.org/testing/opendmarc/opendmarc.conf.5.en.html
- ClamAV clamav-milter.conf(5): https://manpages.debian.org/stretch/clamav-milter/clamav-milter.conf.5.en.html
- Fedora Packages, opendkim for EPEL 9: https://packages.fedoraproject.org/pkgs/opendkim/opendkim/epel-9.html
- Fedora Packages, opendmarc for EPEL 9: https://packages.fedoraproject.org/pkgs/opendmarc/opendmarc/index.html
- Fedora Packages, clamav-milter for EPEL 9: https://packages.fedoraproject.org/pkgs/clamav/clamav-milter/epel-9.html
- Fedora Packages, spamass-milter package files: https://packages.fedoraproject.org/pkgs/spamass-milter/spamass-milter/epel-10.2.html
- Red Hat Customer Portal, OpenDKIM and OpenDMARC package availability for RHEL: https://access.redhat.com/solutions/5241271

## Issues Found
- The prerequisites and install flow did not make clear that OpenDKIM, OpenDMARC, ClamAV milter, and spamass-milter are EPEL-provided packages on RHEL 9. I added EPEL to the prerequisites and moved the `epel-release` install step before the first milter package install.
- The SpamAssassin milter socket path used `/run/spamass-milter/postfix/sock`, but Fedora/EPEL packaging provides `/run/spamass-milter/spamass-milter.sock`. I updated both Postfix milter lists and the monitoring command.
- The timeout defaults for `milter_connect_timeout` and `milter_command_timeout` were incorrect. I changed them to Postfix's documented defaults of `30s`.
- The submission service example set `non_smtpd_milters` under the `smtpd` service. Postfix documents `non_smtpd_milters` for non-SMTP submissions via the sendmail command or qmqpd, not for the submission smtpd service. I removed that override from the `master.cf` example.

## Review Notes
- The OpenDKIM, OpenDMARC, and ClamAV configuration directives shown are valid, but exact service defaults and socket paths can vary by downstream package version and local sysconfig overrides.
- `milter_default_action = accept` is a valid availability-oriented choice, but the Postfix default is `tempfail`; stricter security deployments may prefer the default or a per-milter override.

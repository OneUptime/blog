# Validation Summary: How to Set Up Logwatch for Daily Log Summaries on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Logwatch
- Linux system logs
- cron and cron.daily
- Postfix SMTP relay configuration
- systemd journal / journalctl

## Sources Consulted
- Red Hat Enterprise Linux 9 Package Manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- Oracle Linux 9 Monitoring and Tuning documentation, "Configuring Logwatch": https://docs.oracle.com/en/operating-systems/oracle-linux/9/monitoring/
- Logwatch upstream 7.14 source tarball and bundled man pages: https://sourceforge.net/projects/logwatch/files/
- Logwatch man page reference: https://man.archlinux.org/man/logwatch.8.en
- Logwatch configuration man page reference: https://man.archlinux.org/man/logwatch.conf.5.en
- Postfix SOHO README for relay and SASL password map behavior: https://www.postfix.org/SOHO_README.html
- Postfix TLS README for smtp_tls_security_level behavior: https://www.postfix.org/TLS_README.html

## Issues Found
- The post stated that Logwatch is available in EPEL. RHEL 9 includes Logwatch in its package manifest, so the installation text was changed to say Logwatch is available in standard RHEL repositories and that EPEL is only needed on compatible rebuilds where the package is not otherwise available.
- The permanent service exclusion example created `/etc/logwatch/conf/services/sendmail.conf` with an empty `Title`. That changes the report title metadata and does not disable the service. It was replaced with a negative `Service = "-sendmail"` entry in `/etc/logwatch/conf/logwatch.conf`, matching Logwatch's documented service exclusion mechanism.
- The custom log group example used `*ApplystdDate`. Logwatch's shipped configuration examples use `*ApplyStdDate`, so the snippet was corrected to the canonical shared script name casing.

## Review Notes
- The `between -7 days and today` range form depends on the Perl `Date::Manip` module. Logwatch documents that systems without `Date::Manip` only support `yesterday`, `today`, and `all`.
- Logwatch supports journalctl through its shared `*JournalCtl` helper, but journald coverage depends on the shipped service/logfile configuration or custom service configuration.

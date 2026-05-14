# Validation Summary: How to Set Up Syslog-ng as an Alternative to rsyslog on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- syslog-ng Open Source Edition
- rsyslog
- EPEL
- systemd
- firewalld
- Linux syslog logging
- JSON log parsing and formatting
- TLS log forwarding

## Sources Consulted
- syslog-ng Open Source Edition Administration Guide: https://syslog-ng.github.io/admin-guide/
- syslog-ng OSE 3.37 Administration Guide, system() source behavior on Linux/systemd: https://origin-support.syslog-ng.com/technical-documents/doc/syslog-ng-open-source-edition/3.37/administration-guide/28#TOPIC-1829012
- Fedora Packages, syslog-ng source package and subpackages: https://packages.fedoraproject.org/pkgs/syslog-ng/
- Fedora Packages, syslog-ng in EPEL 9: https://packages.fedoraproject.org/pkgs/syslog-ng/syslog-ng/epel-9.html
- Fedora EPEL getting started documentation for RHEL 9: https://docs.fedoraproject.org/en-US/epel/getting-started/
- Red Hat Blog, EPEL setup for RHEL 9: https://www.redhat.com/en/blog/whats-epel-and-how-do-i-use-it
- Red Hat Enterprise Linux 9 logging documentation: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- util-linux logger manual page: https://manpages.debian.org/unstable/util-linux/logger.1.en.html

## Issues Found
- The EPEL enablement command used `sudo dnf install epel-release -y`, which is not the documented RHEL 9 EPEL setup. Updated it to enable CodeReady Builder and install the EPEL 9 release RPM from Fedora.
- The syslog-ng configuration used `@version: 4.0`, but the EPEL 9 syslog-ng package is 3.35.1. Updated the configuration header to `@version: 3.35`.
- The feature diagram implied database and HTTP/REST output were part of the base setup, but EPEL packages some output support as optional syslog-ng subpackages. Updated those labels to call them output modules.
- The destination comment grouped `/var/log/kern.log` under RHEL standard log files, but RHEL documents `/var/log/messages`, `/var/log/secure`, `/var/log/maillog`, and `/var/log/cron` as the relevant standard syslog files. Updated the comment to identify `kern.log` as an additional kernel log file.
- The JSON validation command used `tail -5 ... | python3 -m json.tool`, which can fail because the file output is newline-delimited JSON records, not one JSON array. Updated it to validate the last JSON record with `tail -n 1 ... | python3 -m json.tool`.

## Review Notes
The remaining syslog-ng snippets use documented concepts and syntax such as `system()`, `internal()`, `tcp()`, `udp()`, `json-parser()`, `format-json`, rewrite `subst()`, TLS options, and `syslog-ng --syntax-only`. The post remains EPEL-dependent; syslog-ng is not part of the base RHEL 9 repositories, and some optional destinations require additional syslog-ng subpackages.

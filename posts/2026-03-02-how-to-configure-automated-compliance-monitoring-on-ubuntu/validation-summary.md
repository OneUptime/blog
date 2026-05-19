# Validation Summary: How to Configure Automated Compliance Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- OpenSCAP
- SCAP Security Guide / ComplianceAsCode content
- Lynis
- Bash scripting
- cron
- auditd / auditctl
- OpenSSH server configuration
- OneUptime HTTP monitoring

## Sources Consulted
- OpenSCAP User Manual: https://static.open-scap.org/openscap-1.3/oscap_user_manual.html
- OpenSCAP documentation manual: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc
- ComplianceAsCode Ubuntu 22.04 CIS Level 1 Server guide: https://complianceascode.github.io/content-pages/guides/ssg-ubuntu2204-guide-cis_level1_server.html
- Ubuntu Launchpad source package for scap-security-guide: https://launchpad.net/ubuntu/+source/scap-security-guide
- Local Ubuntu package metadata for `openscap-scanner`, `ssg-debderived`, `lynis`, and `mailutils`
- CISOfy Lynis documentation: https://cisofy.com/documentation/lynis/
- CISOfy Lynis FAQ for `--report-file`: https://cisofy.com/faq/
- Ubuntu OpenSSH `sshd_config(5)` man page: https://manpages.ubuntu.com/manpages/jammy/en/man5/sshd_config.5.html
- Debian `auditctl(8)` man page: https://manpages.debian.org/buster/auditd/auditctl.8.en.html

## Issues Found
- The OpenSCAP install command used `scap-security-guide`, which is the Ubuntu source package name rather than the installable Ubuntu binary package for Debian-derived SCAP content. Changed it to install `ssg-debderived`.
- The scripts use the `mail` command for alerts but did not install a provider. Added `mailutils` to the package install command.
- The automated OpenSCAP script used `grep -c ... || echo 0`, which can produce `0` twice when no matches are found and then break arithmetic. Changed those counters to `grep -c ... || true`.
- The automated OpenSCAP script used `bc` for percentage math without installing it. Replaced the calculation and threshold comparison with Bash integer arithmetic.
- The custom SSH compliance checks grepped raw config files, which can miss includes, comments, overrides, and `Match` behavior. Changed them to check effective `sshd -T` output for `permitrootlogin no` and `passwordauthentication no`.
- The audit immutable check used `auditctl -l`, but `-l` lists audit rules and does not report the audit enabled/immutable state. Changed it to check `auditctl -s` for `enabled 2`.
- The Lynis examples treated `--report-file` output as a human log and grepped for `Hardening index`. Lynis report files are data files and store the score as `hardening_index=...`. Changed the examples to use `.dat` filenames and parse `hardening_index=`.
- The compliance status endpoint script used the same `grep -c ... || echo 0` pattern, which can produce invalid numeric values. Changed those counters to `grep -c ... || true`.

## Review Notes
- The OpenSCAP examples are tied to Ubuntu 22.04 content (`ssg-ubuntu2204-ds.xml`). Readers on other Ubuntu releases should choose the matching SSG datastream if available.
- Email alerting still requires a working local or relay-backed mail transport configuration; installing a mail command alone may not be sufficient in every environment.
- The OneUptime endpoint example emits CGI-style output, so it still needs to be exposed by an HTTP server or wrapper before an HTTP monitor can call it.

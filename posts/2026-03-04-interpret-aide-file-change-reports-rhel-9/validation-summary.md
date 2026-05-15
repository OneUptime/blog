# Validation Summary: How to Interpret and Act on AIDE File Change Reports on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- AIDE
- RPM and DNF package verification
- Linux audit and login investigation commands

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening guide, Chapter 9: Checking integrity with AIDE: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening#checking-integrity-with-aide
- AIDE manual: https://aide.github.io/doc/
- aide(1) man page for AIDE 0.16 exit status and command options: https://manpages.debian.org/buster/aide/aide.1.en.html
- aide.conf(5) man page for AIDE 0.16 summarized report format and attribute letters: https://sources.debian.org/src/aide/0.16.1-1%2Bdeb10u1/doc/aide.conf.5.in

## Issues Found
- The exit-code table incorrectly grouped all generic errors as "14+". I changed this to "14-19" for AIDE 0.16 and listed the documented generic error categories.
- The summarized report position map was incorrect for the RHEL 9 AIDE 0.16 package. I replaced it with the documented `YlZbpugamcinCAXSE` format and corrected the examples to use valid indicator letters.
- Several common indicator letters were mislabeled: `S` is SELinux, `A` is ACL, `X` is extended attributes, uppercase `C` represents checksum changes, and lowercase `m` and `c` represent modification and change time. I corrected the table.
- The RPM verification text implied that `rpm -V` reporting the same differences proves a package update caused the change. I revised it to distinguish clean verification after a package update from local differences that still need authorization.
- The report section described verbose output as "formats." I changed it to "detail levels" and scoped the `--verbose` examples to RHEL 9's AIDE 0.16 package, where Red Hat documentation still shows AIDE 0.16.

## Review Notes
The commands are appropriate for a RHEL 9-focused post. Newer upstream AIDE releases removed `--verbose` in favor of configuration-based `log_level` and `report_level`, so future posts that are not RHEL 9-specific should avoid presenting `--verbose` as current upstream syntax.

# Validation Summary: How to Configure Custom AIDE Rules in /etc/aide.conf on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- AIDE (Advanced Intrusion Detection Environment)
- `/etc/aide.conf` configuration
- Linux file integrity monitoring
- SELinux attributes, extended attributes, and ACL checks

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation, "Checking integrity with AIDE": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/checking-integrity-with-aide_security-hardening
- AIDE Manual Version 0.16.2: https://aide.github.io/doc/
- AIDE 0.16.1 `aide.conf(5)` man page source: https://sources.debian.org/src/aide/0.16.1-1%2Bdeb10u1/doc/aide.conf.5.in
- AIDE `aide(1)` man page: https://www.mankier.com/1/aide
- AlmaLinux 9 AIDE package default `aide.conf`, used as a RHEL-compatible reference for default rule groups: https://git.almalinux.org/rpms/aide/src/branch/c9/SOURCES/aide.conf

## Issues Found
- The post incorrectly said to prefix paths with `@@` to use regular expressions. AIDE selection paths are already regular expressions, while `@@` is used for macros such as `@@include`. Removed the `@@` prefixes from regex examples and clarified the explanation.
- The directory-only example used `=/data`, which can match additional paths because AIDE adds an implicit start anchor but not an implicit end anchor. Changed it to `=/data$` to match only `/data`.
- The rule precedence section incorrectly described AIDE as top-to-bottom with "last match wins." Updated it to describe AIDE's deepest-match rule tree and first-match behavior within a rule list, and corrected the Mermaid diagram.
- Two custom rule comments overstated what the selectors checked. Adjusted the comments for `FULLCHECK` and `DATAFILES` to match the actual selector lists.

## Review Notes
The post is technically relevant and valid after correction. RHEL 9 documentation shows AIDE 0.16 and the documented `aide --init`, `aide --check`, and database activation flow. The upstream and man-page references confirm the selector names, macro/include syntax, `--config-check`, and AIDE rule matching behavior.

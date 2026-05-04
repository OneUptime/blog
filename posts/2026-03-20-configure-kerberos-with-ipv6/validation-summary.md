# Validation Summary: How to Configure Kerberos with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MIT Kerberos (krb5) — KDC, kadmin, kinit, klist, kdb5_util
- krb5.conf and kdc.conf configuration
- DNS SRV and AAAA records (BIND zone format)
- IPv6 networking
- ip6tables firewall
- systemd service management
- Ubuntu/Debian and RHEL/CentOS package management

## Sources Consulted
- MIT Kerberos klist documentation: https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/klist.html
- MIT Kerberos kinit documentation: https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/kinit.html
- MIT Kerberos kdc.conf documentation: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/kdc_conf.html
- MIT Kerberos krb5.conf documentation: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html
- K5Wiki IPv6 support history: https://k5wiki.kerberos.org/wiki/IPv6

## Issues Found

1. **Incorrect IPv6 version claim.** The post stated "MIT Kerberos (krb5) has supported IPv6 since version 1.7." Per the K5Wiki IPv6 page, client-to-KDC IPv6 support was added in krb5 1.3, ticket `caddr` IPv6 support in 1.2, and kadmin/GSSRPC IPv6 support in 1.9. Updated the sentence to reflect the correct history (1.3 for client-to-KDC, 1.9 for kadmin/GSSRPC).

2. **Invalid `klist -v` flag.** The post used `klist -v` to verify a ticket. MIT Kerberos `klist` does not have a lowercase `-v` (verbose) flag — that is Heimdal-specific. MIT klist only has `-V` (uppercase, prints version and exits). Replaced `klist -v` with `klist -e -f`, which is valid in MIT Kerberos and shows session-key encryption types and ticket flags — the actual verbose-style information a reader would want here.

## Review Notes
- `kdc_listen` (used in the kdc.conf example as a commented-out option) is correct and was added in MIT krb5 1.15 (2016). The IPv6 syntax `[2001:db8::10]:88` with bracketed address is per the official documentation.
- `kinit -V` (uppercase) is correctly used for verbose output — note the case sensitivity difference from `klist`.
- `noaddresses = true` is the default in modern MIT Kerberos `[libdefaults]`, so explicitly setting it is redundant but not incorrect, and the post's emphasis on it for IPv6/dual-stack readers is reasonable.
- The "Test TCP Kerberos" section references `KRB5_CONFIG=/tmp/krb5_ipv6.conf kinit testuser` but that config file is never created in the post. The intent (use a custom config to force a code path) is unclear; not a technical error, but readers may be confused. Left unchanged per scope.
- Package names verified: `krb5-kdc`, `krb5-admin-server`, `krb5-config` (Debian/Ubuntu) and `krb5-server`, `krb5-workstation`, `krb5-libs` (RHEL/CentOS) are all current and correct.
- DNS SRV/AAAA record formats, `kdb5_util create -s -r`, `kadmin.local -q "addprinc ..."`, and the firewall ports (88 UDP/TCP, 749 TCP, 464 TCP) are all correct.

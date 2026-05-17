# Validation Summary: How to Understand /etc/nsswitch.conf on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- /etc/nsswitch.conf (GNU Name Service Switch)
- glibc NSS framework (databases, sources, actions)
- nss-mdns (mdns4_minimal, mdns4, mdns)
- systemd-resolved / nss-resolve
- nss-myhostname / nss-systemd / nss-mymachines
- SSSD (System Security Services Daemon)
- Samba winbind
- LDAP / NIS
- getent CLI tool
- strace for NSS debugging
- nscd / nsncd (Name Service Caching Daemons)
- Ubuntu system administration

## Sources Consulted
- nsswitch.conf(5) Debian manpages — https://manpages.debian.org/bookworm/manpages/nsswitch.conf.5.en.html
- nss-resolve(8) systemd documentation — https://www.freedesktop.org/software/systemd/man/latest/nss-resolve.html
- nss-mdns README (lathiat) — https://github.com/lathiat/nss-mdns/blob/master/README.md
- glibc Name Service Switch documentation — https://www.gnu.org/software/libc/manual/html_node/Name-Service-Switch.html
- Fedora DeprecateNSCD change — https://fedoraproject.org/wiki/Changes/DeprecateNSCD
- nscd package in Ubuntu Noble — https://launchpad.net/ubuntu/noble/+package/nscd
- RFC 6762 (Multicast DNS) for .local handling

## Issues Found

1. **Deprecated `nscd` recommendation** — The post recommended installing `nscd` via `sudo apt install nscd` for NSS caching. While `nscd` is still in Ubuntu 24.04 universe, it was deprecated in glibc 2.32 and removed from glibc upstream in 2.40. I updated the "Negative Caching" section to recommend `nsncd` (a modern drop-in replacement still packaged in Ubuntu) and noted the upstream deprecation of `nscd`. The mention of systemd-resolved's built-in cache was preserved.

## Review Notes

- **mdns4_minimal explanation**: The post's explanation of `[NOTFOUND=return]` is technically correct. The mechanism works because mdns4_minimal returns `UNAVAIL` for non-`.local` names (allowing fall-through to DNS) but `NOTFOUND` for `.local` names that don't exist (which `[NOTFOUND=return]` short-circuits to prevent leaking `.local` queries to public DNS). The post does not explicitly call out the UNAVAIL-vs-NOTFOUND nuance, but the step-by-step explanation is accurate.

- **systemd-resolved config ordering**: The post recommends `hosts: files mymachines resolve [!UNAVAIL=return] dns mdns4_minimal myhostname` (files first). The upstream `nss-resolve(8)` canonical line is `hosts: mymachines resolve [!UNAVAIL=return] files myhostname dns` (files after resolve). The post's `files`-first ordering matches Debian/Ubuntu convention and ensures `/etc/hosts` overrides are honored even when systemd-resolved is healthy. This is a defensible deviation, so I did not change it.

- **UNAVAIL status description**: "Service is permanently unavailable" matches glibc's own wording in the manual, so it was left unchanged. In practice it can also mean "this provider does not handle this query type" (e.g., mdns4_minimal returning UNAVAIL for non-.local names), but the post's wording is consistent with the official docs.

- **netgroup database description**: The table says "NIS netgroup entries" — netgroups can also be served from LDAP/SSSD, but NIS is the historical default and the description is acceptable for an introductory guide.

- **Default Ubuntu nsswitch.conf snippet**: Matches what Ubuntu 22.04/24.04 ships.

- **All `getent`, `strace`, `systemctl`, and `sssctl` commands**: Verified syntactically correct and functionally accurate.

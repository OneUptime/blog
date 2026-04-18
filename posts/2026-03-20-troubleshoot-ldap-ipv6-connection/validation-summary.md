# Validation Summary: How to Troubleshoot LDAP IPv6 Connection Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- LDAP / OpenLDAP (slapd, ldapsearch)
- IPv6 networking (ping6, traceroute6, ip, ss)
- TLS / LDAPS (openssl s_client, StartTLS)
- Firewalling (ip6tables, firewalld/firewall-cmd)
- DNS (dig AAAA, reverse DNS, getaddrinfo)
- SSSD (sssd.conf, sss_cache, journalctl)
- Common CLI tools: nc, curl, nmap, python3 socket

## Sources Consulted
- OpenLDAP ldapsearch(1) and ldap.conf(5) manual pages
- OpenLDAP URI format (RFC 4516)
- iputils ping6/ping -6 documentation
- iproute2 `ss` and `ip` manual pages
- firewalld documentation (https://firewalld.org/documentation/man-pages/firewall-cmd.html)
- netfilter ip6tables manual pages
- SSSD documentation (sssd.conf(5), sss_cache(8))
- OpenSSL s_client(1) manual
- BIND dig(1) manual

## Issues Found
1. **Invalid `firewall-cmd --temporary` flag.** `firewall-cmd` does not have a `--temporary` option. By default (no flag), rules are runtime-only (reverted on reload); for a timed rule, `--timeout=SECONDS` is used. Changed the command to drop `--temporary` and added a clarifying comment about runtime vs. `--timeout`.
2. **Misleading error entry in the common errors table.** The original table listed `Invalid DN syntax` as the error you see when IPv6 bracket format is wrong in the URI. `Invalid DN syntax` is actually an LDAP error for malformed DN strings. The URI parsing error from OpenLDAP is closer to `ldap_url_parse_ext: URL parsing error`. Updated the table row accordingly.

## Review Notes
- `ping6` and `traceroute6` still work on most distros but are deprecated in recent iputils/inetutils in favor of `ping -6` / `traceroute -6`. Leaving as-is since the commands still function on currently supported distros.
- The `sed -i 's/debug_level = .*/debug_level = 9/' /etc/sssd/sssd.conf` command only works if `debug_level` already exists in the file; otherwise it silently no-ops. Acceptable as a quick operation but worth noting.
- `/var/log/sssd/sssd_LDAP.log` assumes the SSSD domain section is named `[domain/LDAP]`; readers should substitute the actual domain name from their `sssd.conf`.
- `curl` with `ldap://` scheme requires curl to be built with LDAP support, which is not universal. Acceptable as an optional alternative.
- IPv6 URI bracket syntax (`ldap://[2001:db8::1]:389/`) matches RFC 4516 / RFC 3986 correctly throughout the post.

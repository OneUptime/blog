# Validation Summary: How to Troubleshoot DNS Resolution Issues with dig and nslookup on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNS
- BIND utilities
- dig
- nslookup
- DNSSEC
- systemd-resolved resolvectl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing networking infrastructure services, BIND setup and `bind-utils` installation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/assembly_setting-up-and-configuring-a-bind-dns-server_networking-infrastructure-services
- ISC BIND 9 manual pages for `dig`, `nslookup`, and DNS lookup utility options: https://bind9.readthedocs.io/en/v9.21.14/manpages.html
- RFC 4035: Protocol Modifications for the DNS Security Extensions, including AD and CD bit behavior: https://www.rfc-editor.org/rfc/rfc4035
- Local `dig -h` output from BIND 9.18-compatible tooling to verify query options such as `+trace`, `+dnssec`, `+short`, `+timeout`, and `+cd`.
- Local `nslookup(1)` and `resolvectl(1)` man pages to verify command syntax and behavior.

## Issues Found
- The introductory paragraph contained corrupted text: `arRHELprimary` and `fRHELs`. Changed it to state that `dig` and `nslookup` are primary tools for diagnosing DNS failures, from simple lookup failures to delegation and DNSSEC issues.
- The DNSSEC check implied that the `ad` flag should always be expected after `dig +dnssec`. Clarified that the `ad` flag is meaningful when querying through a DNSSEC-validating resolver.
- The SERVFAIL section said that if `+cd` works while the normal query fails, "there is a DNSSEC problem." Changed this to "there is likely a DNSSEC validation problem" because the CD bit requests disabled checking for that query, and the result still depends on resolver behavior and policy.
- The "Wrong answer" command block used an invalid Markdown language marker, `bashRHEL`. Changed it to `bash`.

## Review Notes
The command examples for installing `bind-utils`, running `dig` record lookups, querying specific servers, using `+trace`, using `+short`, reverse lookup with `-x`, basic `nslookup` usage, and checking `/etc/resolv.conf` are technically valid. `resolvectl status` is valid on systems using systemd-resolved; on RHEL systems where systemd-resolved is not active, `/etc/resolv.conf` and NetworkManager DNS settings may be more relevant.

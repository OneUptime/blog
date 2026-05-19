# Validation Summary: How to Configure systemd-resolved for DNS Management on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- systemd-resolved
- resolvectl
- systemd resolved.conf drop-ins
- DNS-over-TLS
- DNSSEC
- Netplan
- mDNS and LLMNR

## Sources Consulted
- systemd resolved.conf(5), local Ubuntu systemd 255 man page and upstream documentation: https://www.freedesktop.org/software/systemd/man/254/resolved.conf.html
- systemd-resolved.service(8), local Ubuntu systemd 255 man page and upstream documentation: https://www.freedesktop.org/software/systemd/man/249/systemd-resolved.html
- resolvectl(1), local Ubuntu systemd 255 help/man page and Ubuntu Noble man page: https://manpages.ubuntu.com/manpages/noble/man1/resolvectl.1.html
- Netplan tutorial and nameserver examples: https://netplan.readthedocs.io/en/0.106.1/netplan-tutorial/

## Issues Found
- The post described `127.0.0.54` as a direct-query interface that bypasses some routing logic. Updated it to describe the documented proxy stub behavior: it forwards most DNS messages to upstream DNS servers and does not perform local DNSSEC validation or LLMNR/mDNS handling.
- The post said system-wide `DNS=` servers are used as fallback when no interface-specific DNS is configured. Updated this to distinguish global `DNS=` from `FallbackDNS=`, which is only used when no other DNS server information is available.
- The DNS-over-TLS hostname suffix explanation said resolved cannot verify identity without `#hostname`. Updated it because systemd-resolved instead checks the certificate against the server IP address when no SNI hostname is supplied.
- The DoT verification command grepped for `DNS over TLS`, but current `resolvectl status` output uses `DNSOverTLS`. Updated the grep pattern.
- The DNSSEC example comment said `DNSSEC=yes` fails for unsigned zones. Updated it because DNSSEC validation can prove valid unsigned delegations; failures occur for invalid data or servers that do not support DNSSEC properly.
- The `resolvectl query --legend example.com` examples were invalid because `--legend` requires a boolean argument. Updated them to `--legend=yes`.
- The cache configuration section implied `CacheFromLocalhost=yes` caches NXDOMAIN responses and referred to negative-cache TTL control. Updated the snippet to use the documented `Cache=no-negative` setting and describe `CacheFromLocalhost=yes` accurately.
- The statistics command was described as showing cache hit rate. Updated the comment to the more accurate "Resolver statistics."

## Review Notes
The Netplan DNS examples, per-interface `resolvectl dns` and `resolvectl domain` commands, split-DNS route-only domain examples, mDNS/LLMNR keys, drop-in directory usage, and debug logging override were consistent with the consulted documentation. `resolvectl statistics` may require sufficient local permissions on some systems.

# Validation Summary: How to Set Up mDNS/Avahi for Local Network Discovery on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Avahi daemon (mDNS / DNS-SD implementation for Linux)
- libnss-mdns (NSS module for `.local` resolution)
- systemd-resolved (`resolvectl`)
- DNS-SD service file format (XML, `avahi-service.dtd`)
- avahi-utils CLI (`avahi-browse`, `avahi-resolve`, `avahi-daemon`)
- Ubuntu 22.04+ (apt, systemd)
- tcpdump for verifying multicast traffic on UDP/5353

## Sources Consulted
- `avahi-daemon.conf(5)` man page (verified option names and behaviors for `[server]`, `[publish]`, `[reflector]`, and `[rlimits]` sections)
- Avahi project documentation at https://avahi.org/
- libnss-mdns 0.15.1 (current Ubuntu version) — https://github.com/avahi/nss-mdns
- systemd-resolved documentation (`resolvectl` vs deprecated `systemd-resolve`)
- Apple Bonjour / DNS-SD specs (RFC 6762 mDNS, RFC 6763 DNS-SD) for port 5353 / 224.0.0.251 claims

## Issues Found
1. **`use-iff-running` comment was incorrect.** The original post described it as "Use the system hostname as the mDNS hostname." Per `avahi-daemon.conf(5)`, this option monitors the `IFF_RUNNING` interface flag bit to detect link state. Corrected the comment to accurately describe the option.
2. **Non-existent `publish-address=yes` option in `[server]` section.** This option does not exist in Avahi. The actual option is `publish-addresses` (plural) and it belongs in the `[publish]` section, which the post already covers correctly. Removed the misleading commented-out line and its incorrect description.
3. **Misleading `reflect-ipv` comment.** The original comment said "Also reflect IPv6 mDNS." Per the man page, `reflect-ipv` actually forwards mDNS traffic *between* IPv4 and IPv6 (cross-family), which is "usually not recommended." Updated the comment to reflect the actual behavior.
4. **`systemd-resolve` is deprecated.** On Ubuntu 22.04+ the canonical command is `resolvectl status`. `systemd-resolve` remains as a deprecated wrapper. Replaced with `resolvectl status`.
5. **`sudo avahi-daemon --check` comment was wrong.** It does not verify interfaces — it returns 0 if avahi-daemon is already running. Corrected the comment.
6. **`avahi-browse --dump-db` comment was wrong.** This option dumps the DNS-SD service-type database (list of known service types), not interfaces in use. Corrected the comment.

## Review Notes
- The `rlimit-nofile=300` example is much higher than necessary (the man page notes 15–20 file descriptors are sufficient), but it is not technically incorrect — many distro defaults set it generously, so I left it alone.
- `publish-hinfo=yes` works but the Avahi default is `no` for privacy reasons; the post's example value diverges from the default but is a valid documented choice.
- The simplified `nsswitch.conf` example (`files mdns4_minimal [NOTFOUND=return] dns`) omits the trailing `mdns4` and the `resolve` entry that Ubuntu's libnss-mdns installer typically inserts. It is not wrong as an illustration but slightly simplified.
- The `_https._tcp` service type is registered with IANA but is uncommon in practice — most HTTPS endpoints are still advertised as `_http._tcp` with a TXT record or via `_https._tcp` alongside; either choice is valid.
- All XML service-file examples conform to the `avahi-service.dtd` and are syntactically correct.
- All other commands (`avahi-resolve --name/--address`, `avahi-browse --all/--resolve/--terminate/--parsable`, `journalctl -u`, `tcpdump 'udp port 5353'`, multicast address 224.0.0.251) are accurate.

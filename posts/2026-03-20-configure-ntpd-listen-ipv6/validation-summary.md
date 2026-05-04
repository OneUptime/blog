# Validation Summary: How to Configure ntpd to Listen on IPv6

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ntpd (NTP reference implementation daemon)
- ntp.conf configuration file
- ntpq (NTP query/control utility)
- ntpdate (NTP query/sync utility)
- ss (socket statistics tool)
- IPv6 networking
- systemctl / systemd unit management
- sysctl (kernel parameter management)
- SELinux (semanage, audit2allow, ausearch)
- Debian/Ubuntu and RHEL/CentOS package managers (apt, dnf)

## Sources Consulted
- ntp.org documentation: https://www.ntp.org/documentation/4.2.8-series/miscopt/ (interface directive syntax)
- ntp.org documentation: https://www.ntp.org/documentation/4.2.8-series/access/ (restrict directive)
- ntp.org configuration guide: https://www.ntp.org/documentation/4.2.8-series/confopt/
- ntpq manpage: https://www.ntp.org/documentation/4.2.8-series/ntpq/
- iproute2 ss(8) manpage
- Linux sysctl(8) and kernel net.ipv6 documentation
- SELinux semanage(8) and audit2allow(1) manpages
- Debian /etc/default/ntp convention (Debian ntp package documentation)

## Issues Found
- **`interface` directive arguments (Options 3, 4, 5):** The original post used the literal IPv6 unspecified address `::` (and IPv4 `0.0.0.0`) as arguments to `interface listen` / `interface ignore` to mean "all IPv6/IPv4 interfaces." Per ntp.conf documentation, the directive syntax is `interface [listen | ignore | drop] [all | ipv4 | ipv6 | wildcard | name | address[/prefixlen]]`. The `ipv4` and `ipv6` keywords are the documented way to match all addresses of a family. A literal `::` is interpreted as a single specific address (the wildcard pseudo-socket), which would not match per-interface IPv6 addresses the way the post described. Updated Options 3, 4, and 5 to use the documented `ipv4`/`ipv6` keywords for clarity and accuracy.

## Review Notes
- The `restrict <addr>/<prefixlen>` CIDR notation (e.g. `restrict 2001:db8:1::/48`) is widely used and accepted in modern ntpd 4.2.8+ configurations. The classic alternative uses an explicit `mask`. Both work; left as-is.
- `ntpdate` is deprecated in newer ntp distributions in favor of `sntp`, but the `ntpdate -q` query form referenced in the post still functions where the binary is present.
- The `notrap` restrict flag is associated with the legacy mode 6 trap mechanism (deprecated/removed in some forks like NTPsec) but remains valid and harmless in the reference ntp 4.2.8 series this post targets.
- On RHEL 8+ the `ntp` package was removed in favor of `chrony`; the `dnf install ntp` line will fail there. The post is primarily Debian/Ubuntu oriented (uses `/etc/default/ntp`, service name `ntp`), so this is a known caveat rather than a correctness error.
- The systemctl service name `ntp` is correct on Debian/Ubuntu; on RHEL 7 (where ntp was last shipped) the service is `ntpd`. Minor cross-distro caveat, not changed.
- The recommendation to put `ntpd_t` into permissive mode is appropriate only as a temporary diagnostic step; the post correctly notes this is for testing and follows up with `audit2allow` for proper policy generation.

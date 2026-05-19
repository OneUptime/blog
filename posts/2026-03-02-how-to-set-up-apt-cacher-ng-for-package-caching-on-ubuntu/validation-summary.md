# Validation Summary: How to Set Up APT Cacher NG for Package Caching on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- APT Cacher NG (caching proxy server for Debian/Ubuntu package repositories)
- APT (Acquire proxy directives, apt.conf.d configuration)
- systemd (service management)
- UFW (firewall rules)
- Docker (build-arg proxy configuration)
- squid-deb-proxy-client + avahi-daemon (auto-discovery)
- OpenSSL (CA certificate generation)
- cron (weekly expiration job)
- `ss`, `du`, `tail`, `awk`, `grep` (monitoring utilities)

## Sources Consulted
- The Ubuntu `apt-cacher-ng` package (version 3.7.4-1ubuntu5.24.04.1) shipped on Noble — extracted and inspected its contents (`/etc/cron.daily/apt-cacher-ng`, `/usr/sbin/apt-cacher-ng`, `/usr/lib/apt-cacher-ng/acngtool`, `expire-caller.pl` symlink).
- The default config files shipped by the package: `/etc/apt-cacher-ng/acng.conf` and `/etc/apt-cacher-ng/security.conf` — verified the canonical directive names (`CacheDir`, `LogDir`, `Port`, `BindAddress`, `ReportPage`, `VerboseLog`, `ExThreshold`, `PassThroughPattern`) and their default values.
- Upstream Apt-Cacher NG project page: http://www.unix-ag.uni-kl.de/~bloch/acng/
- APT configuration reference (`apt.conf(5)`) for `Acquire::http::Proxy` and `Acquire::https::Proxy "DIRECT"` semantics.

## Issues Found
1. **Typo in the `ExThreshold` configuration directive.** The post wrote `ExTreshold: 4` (missing the `h`). The actual directive name in the shipped `acng.conf` for version 3.7.4 is `ExThreshold`. Using the misspelled name would be silently ignored by apt-cacher-ng. Fixed in the Basic Configuration section.
2. **Non-existent `apt-cacher-ng-expiry` command.** The post recommended running `sudo apt-cacher-ng-expiry`, but no such binary is installed by the package. The actual maintenance entry points are `/etc/cron.daily/apt-cacher-ng` (the script installed by the package, which itself calls `/usr/lib/apt-cacher-ng/acngtool maint ...`) or invoking `acngtool` directly. Replaced the command with `sudo /etc/cron.daily/apt-cacher-ng`, which is the standard, packaged maintenance entry point.

## Review Notes
- `PassThroughPattern: .*` in the basic-config example is permissive — it allows CONNECT tunneling to any host/port. The shipped default config explicitly comments that this pattern "would allow CONNECT to everything." It is syntactically valid and matches the section's stated intent ("Allow CONNECT tunneling for HTTPS"), so I left it as the author wrote it; the HTTPS section later in the post shows a more restrictive pattern, which is the better practical example.
- The package already installs `/etc/cron.daily/apt-cacher-ng` for automatic expiration, so the user-defined `/etc/cron.weekly/apt-cacher-ng-expire` cron job in the post is redundant in practice. It is not incorrect, just duplicative; the post does not claim otherwise so no edit was required.
- The "SSL Bumping for HTTPS Caching" section is incomplete — generating a CA cert and installing it on clients alone does not configure apt-cacher-ng to perform MITM inspection (the corresponding `acng.conf` server-side configuration is omitted). The post calls this "more complex" and frames it as a sketch rather than a complete recipe, so it isn't factually wrong, but readers should not expect the snippets to be sufficient on their own. Apt-Cacher NG's more typical HTTPS handling is via `Remap-*` URL rewriting and the `PassThroughPattern` tunneling shown elsewhere in the post.
- `squid-deb-proxy-client` discovers proxies announcing `_apt_proxy._tcp` via mDNS. Installing `avahi-daemon` on the apt-cacher-ng server is necessary but not sufficient — an Avahi service file announcing the proxy is also required. The post elides this detail; not technically incorrect but worth a follow-up.
- The use of `sudo ufw deny 3142` after `sudo ufw allow from 192.168.1.0/24 to any port 3142 proto tcp` works because UFW orders the more-specific allow rule before the broad deny. Functionally correct.
- Tested config directive names against the actual `acng.conf` shipped in Ubuntu 24.04 (apt-cacher-ng 3.7.4); these may differ for substantially older Ubuntu releases.

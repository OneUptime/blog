# Validation Summary: How to Set Up GeoIP Blocking with iptables or nftables

## Status
validated

## Post Type
Guide

## Technologies Covered
- GeoIP country blocking
- `iptables`
- `xtables-addons`
- `ipset`
- `nftables`
- Bash
- Linux firewalling
- `cron`

## Sources Consulted
- Xtables-addons GeoIP documentation: https://inai.de/projects/xtables-addons/geoip.php
- Debian `xt_geoip_dl(1)` man page: https://manpages.debian.org/testing/xtables-addons-common/xt_geoip_dl.1.en.html
- Debian `xt_geoip_build(1)` man page: https://manpages.debian.org/testing/xtables-addons-common/xt_geoip_build.1.en.html
- Debian `xtables-addons-common` package file list: https://packages.debian.org/trixie/i386/xtables-addons-common/filelist
- Debian `xtables-addons-dkms` package details: https://packages.debian.org/unstable/main/xtables-addons-dkms
- `ipset(8)` manual: https://ipset.netfilter.org/ipset.man.html
- `iptables(8)` manual: https://man7.org/linux/man-pages/man8/iptables.8.html
- `iptables-extensions(8)` manual: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `nft(8)` manual: https://netfilter.org/projects/nftables/manpage.html
- ipdeny country lists: https://www.ipdeny.com/ipblocks/data/countries/

## Issues Found
- The Debian/Ubuntu install command only installed `xtables-addons-common`, which provides userspace pieces but not the `xt_geoip` kernel module. I added `xtables-addons-dkms`, matching kernel headers, and the Perl dependencies used by the GeoIP build helpers.
- The `xt_geoip` database build example mixed the default `xt_geoip_build` script with MaxMind GeoLite2 filenames and an outdated helper path. Current xtables-addons documents the DB-IP workflow via `xt_geoip_dl` and `xt_geoip_build`, with helpers shipped under `/usr/libexec/xtables-addons`, so I corrected the commands accordingly.
- The `ipset` scripts were not safe to rerun: removed CIDRs would remain in the set because `-exist` does not flush old entries, and repeated runs would append duplicate `iptables` rules. I added `ipset flush` and `iptables -C ... || iptables -A ...` guards.
- The download commands used `curl -s`, which suppresses HTTP errors. In the allowlist example, a failed download could leave the set empty and then block all TCP/443 traffic. I changed the scripts to `set -euo pipefail` and `curl -fsSL` so they fail closed before installing bad rules.
- The `ipdeny`-based examples operate on IPv4 data, but the wording was generic. I clarified the IPv4 scope and made the nftables set reload path idempotent with `nft flush set`.
- The allowlist comment said it would "drop everything else" even though the rules only applied to TCP port `443`. I corrected the comment to match the actual firewall behavior.

## Review Notes
- The `ipset` and `nftables` examples remain IPv4-only because they use the `ipdeny` country `.zone` lists together with `family inet`/`ipv4_addr`. Dual-stack deployments need separate IPv6 data and matching IPv6 rules.
- Live rule installation was not executed in this environment: `nft` syntax checks still require root-level netlink access here, and `ipset` is not installed locally. The review relied on upstream man pages, package metadata, and xtables-addons helper script documentation.

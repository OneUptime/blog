# Validation Summary: How to Set Up dnsmasq as a Lightweight DNS Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- dnsmasq (DNS forwarder and DHCP server)
- Ubuntu
- systemd-resolved
- BIND9 (comparison context)
- /etc/hosts
- /etc/resolv.conf
- chattr (file attributes)
- dig / nslookup
- ufw (firewall)

## Sources Consulted
- Official dnsmasq man page — https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- Arch Wiki dnsmasq page — https://wiki.archlinux.org/title/Dnsmasq
- dnsmasq-discuss mailing list archives — https://lists.thekelleys.org.uk/pipermail/dnsmasq-discuss/
- dnsmasq.conf.example reference — https://github.com/imp/dnsmasq/blob/master/dnsmasq.conf.example
- systemd-resolved documentation (DNSStubListener option)

## Issues Found

1. **Incorrect CHAOS TXT query name for cache statistics.** The original line was:
   ```
   # Check cache statistics
   dig @127.0.0.1 bind.version CHAOS TXT
   ```
   This had two problems:
   - The query name was reversed: dnsmasq responds to `version.bind`, not `bind.version`.
   - Even with the correct ordering, `version.bind` returns dnsmasq's version string, not cache statistics. The dnsmasq CHAOS queries for cache statistics are `cachesize.bind`, `hits.bind`, `misses.bind`, `insertions.bind`, and `evictions.bind`.

   Replaced with the correct cache-statistics queries:
   ```
   # Check cache statistics
   dig @127.0.0.1 cachesize.bind CHAOS TXT
   dig @127.0.0.1 hits.bind CHAOS TXT
   dig @127.0.0.1 misses.bind CHAOS TXT
   ```

## Review Notes
- The `interface=eth0` example assumes the classic interface name. Modern Ubuntu releases (18.04+) use predictable interface names like `enp0s3` or `ens33` by default. Readers should substitute their actual interface name as reported by `ip link`. This is acceptable for a tutorial but worth noting.
- The `address=/.dev.local/192.168.1.200` line uses a leading dot before the domain. In dnsmasq, the standard form `address=/dev.local/192.168.1.200` already matches `dev.local` and all of its subdomains; the leading dot is non-standard but harmless in practice (dnsmasq tolerates it). The comment about matching all subdomains remains accurate.
- The `chattr +i /etc/resolv.conf` approach to prevent overwrites is a common technique, but a cleaner long-term alternative on systems using `systemd-resolved` is to symlink `/etc/resolv.conf` to a static file or rely on `DNSStubListener=no` alone. This is a stylistic recommendation, not a correctness issue.
- `conf-dir=/etc/dnsmasq.d/,*.conf` syntax is correct — the leading `*` on the extension makes it an inclusion filter (only `.conf` files are loaded).
- `domain-needed`, `bogus-priv`, `expand-hosts`, `addn-hosts`, `server=/domain/ip` split-forwarding, `address=`, `cname=`, and `--test` are all documented dnsmasq options and used correctly.
- `DNSStubListener=no` in `/etc/systemd/resolved.conf` is the correct way to free port 53 for dnsmasq.
- The reverse-zone forwarding example `server=/168.192.in-addr.arpa/10.0.0.1` correctly forwards reverse lookups for the entire 192.168.0.0/16 range.

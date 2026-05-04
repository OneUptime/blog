# Validation Summary: How to Configure Redis Sentinel with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (server)
- Redis Sentinel
- IPv6 networking
- redis-py (Python Redis client)
- ip6tables / iptables-persistent
- systemd

## Sources Consulted
- Official Redis configuration reference: https://redis.io/docs/latest/operate/oss_and_stack/management/config-file/
- Official Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Sample `redis.conf` and `sentinel.conf` from the Redis source tree
- redis-py Sentinel documentation: https://redis-py.readthedocs.io/en/stable/connections.html#sentinel-client
- redis-py source `redis/sentinel.py` (master branch)
- Redis source `src/sentinel.c` (for `SENTINEL replicas`/`slaves` aliases)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- Debian `iptables-persistent` / `netfilter-persistent` package documentation (rules path `/etc/iptables/rules.v[46]`)

## Issues Found
1. **Invalid IPv6 addresses (`2001:db8::sentinel1`, `::sentinel2`, `::sentinel3`)** — IPv6 hextets only allow hexadecimal characters (0-9, a-f). The letters `s`, `n`, `t`, `l` are not valid hex, so these strings would fail to parse and any `redis-cli`/`bind`/`announce-ip` command using them would error. Replaced all occurrences with valid documentation-range addresses (`2001:db8::10`, `2001:db8::11`, `2001:db8::12`) across the Sentinel config, `redis-cli` examples, the failover-verification snippet, and the Python Sentinel client list.
2. **Incorrect iptables-persistent path (`/etc/ip6tables/rules.v6`)** — The Debian `iptables-persistent` package stores both IPv4 and IPv6 rules under `/etc/iptables/` (as `rules.v4` and `rules.v6`). Changed `sudo ip6tables-save > /etc/ip6tables/rules.v6` to `sudo ip6tables-save > /etc/iptables/rules.v6` so the saved rules are actually loaded on boot.

## Review Notes
- The `protected-mode (disable for IPv6 network testing)` comment in the primary `redis.conf` example is slightly ambiguous — the directive is set to `yes` (enabled), which is the correct production default; the parenthetical reads as a hint that it can be disabled for testing rather than an instruction. Left unchanged because the value itself is correct and safer.
- redis-py still exposes `Sentinel.slave_for()` (no `replica_for()` alias as of the current redis-py releases), so the Python example is correct. If/when redis-py renames the API, the snippet will need updating.
- `SENTINEL replicas` is the modern command (added in Redis 5.0, October 2018); `SENTINEL slaves` remains as a deprecated alias. The post correctly uses the modern form.
- `bind <addr1> <addr2> ...` accepts space-separated IPv4 and IPv6 addresses on a single line, which is the documented and supported syntax in `redis.conf`.
- `replicaof` (used in the replica config) is the modern directive name; `slaveof` is a deprecated alias kept for backward compatibility.
- The post does not pin a specific Redis version. The directives shown (`replicaof`, `replica-lazy-flush`, `sentinel announce-ip`, `sentinel announce-port`, `SENTINEL replicas`) all require Redis 5.0 or newer. A version note at the top of the post could be a future improvement but is not a technical error.

# Validation Summary: How to Monitor Redis with redis-stat on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- redis-stat (Ruby gem monitoring tool by junegunn)
- Redis (server, redis-cli)
- Ruby / RubyGems
- Ubuntu (apt, systemd, UFW, logrotate)
- redis_exporter (Prometheus exporter, mentioned as alternative)

## Sources Consulted
- redis-stat README on GitHub: https://github.com/junegunn/redis-stat
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis CONFIG GET docs (for maxmemory-policy)
- Redis SLOWLOG docs (slowlog-log-slower-than in microseconds)
- redis_exporter releases: https://github.com/oliver006/redis_exporter/releases

## Issues Found
No technical issues found. Verified the following key claims:

- `gem install redis-stat` is the correct install method.
- Usage format `redis-stat [HOST[:PORT][/PASS] ...] [INTERVAL [COUNT]]` matches official docs.
- `--auth=PASSWORD` flag is correct (also aliased as `-a`).
- `--server[=PORT]` with default port 63790 is correct per docs.
- `redis-stat 1 60` correctly means interval=1s, count=60 iterations.
- INFO sections referenced are accurate: `keyspace_hits`/`keyspace_misses` are in the `stats` section; `mem_fragmentation_ratio` is in the `memory` section.
- Fragmentation ratio interpretation (1.0–1.5 normal, >1.5 fragmentation, <1.0 swapping) matches Redis documentation.
- Maxmemory policies named (`allkeys-lru`, `volatile-lru`, `noeviction`) are valid Redis eviction policies.
- `BLPOP`/`BRPOP` correctly identified as blocking commands.
- `slowlog-log-slower-than` is correctly described as being in microseconds.
- The systemd unit, UFW rule, and logrotate snippet are syntactically valid.
- The `/usr/local/bin/redis-stat` ExecStart path is the typical install location for gems installed via `sudo gem install` against system Ruby on Ubuntu.

## Review Notes
- redis-stat itself is effectively unmaintained upstream (no recent commits to junegunn/redis-stat for several years). It still works for basic INFO-based monitoring but new users may want to consider redis_exporter + Prometheus/Grafana for long-term setups. The post already mentions this alternative.
- The redis_exporter wget URL uses `v1.x.x` as a placeholder version — readers must replace it with a real release tag (e.g., `v1.66.0`) before the command will succeed. This is clearly a placeholder rather than a technical error.
- Capturing `redis-stat` output via `>> /var/log/redis-stat.log` will include ANSI color escape codes when running attached to a TTY. For cleaner log output, the `--csv=FILE` and/or `--no-color` flags (both documented in redis-stat) would be preferable. Not corrected because the example as written is functional, just noisy.

# Validation Summary: How to Scale Redis with Connection Proxies (Twemproxy)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Twemproxy (nutcracker)
- Python (redis-py client library)

## Sources Consulted
- Twemproxy GitHub repository README: https://github.com/twitter/twemproxy
- Twemproxy configuration documentation: https://github.com/twitter/twemproxy/blob/master/README.md
- Twemproxy Redis command support notes: https://github.com/twitter/twemproxy/blob/master/notes/redis.md
- Twemproxy source code for command fragmentation: https://github.com/twitter/twemproxy/blob/master/src/proto/nc_redis.c

## Issues Found

1. **Incorrect log file CLI flag**: The `nutcracker` start command used `-l` for the log file output flag. The correct flag is `-o` (or `--output`). Changed `-l /var/log/nutcracker.log` to `-o /var/log/nutcracker.log`.

2. **Stats configuration shown as pool-level YAML options**: The blog post placed `stats_port` and `stats_interval` inside the pool definition in the YAML config file. These are command-line-only options (`-s`/`--stats-port` and `-i`/`--stats-interval`), not valid pool-level configuration keys. Replaced the incorrect YAML snippet with the correct CLI invocation: `nutcracker -c /etc/twemproxy/nutcracker.yml -s 22222 -i 30000`.

3. **Incorrect claim that MGET/MSET are unsupported**: The post stated "Twemproxy does not support multi-key commands (MGET, MSET) unless all keys hash to the same backend." This is incorrect — Twemproxy supports MGET and MSET through command fragmentation, splitting them across backends and reassembling results. Corrected the limitations section to accurately describe which cross-key commands are truly unsupported (RENAME, SDIFF, SINTER, SUNION, ZUNIONSTORE, etc.).

## Review Notes
- The Twemproxy stats endpoint is a raw TCP server, not an HTTP server. The `curl` command shown in the post works in practice because Twemproxy sends JSON on any TCP connection, but users should be aware it is not a standard HTTP endpoint.
- The git clone URL points to `twitter/twemproxy` which is the canonical repository. The project has been relatively stable with infrequent updates.
- The Python code example using redis-py is correct and would work as described when connecting through Twemproxy.
- The YAML configuration format, hash function (`fnv1a_64`), distribution (`ketama`), and server format (`host:port:weight name`) are all correct per the official documentation.

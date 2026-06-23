# Validation Summary: How to Set Up Redis on Ubuntu for Production

## Status
validated

## Post Type
Tutorial / Guide (step-by-step production setup)

## Technologies Covered
- Redis (server, redis-cli, redis-sentinel)
- Redis Sentinel (high availability)
- Redis Cluster (sharding / horizontal scaling)
- Ubuntu / Linux (apt, systemd, sysctl, UFW, logrotate, cron)
- OpenSSL (TLS certificate and password generation)
- redis-py (Python Sentinel client)

## Sources Consulted
- Redis persistence documentation (RDB/AOF, multi-part AOF in 7.0+): https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis official APT repository instructions: https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/install-redis-on-linux/
- Redis configuration reference (redis.conf directives): https://redis.io/docs/latest/operate/oss_and_stack/management/config-file/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Cluster tutorial: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis security guidelines: https://redis.io/docs/latest/operate/oss_and_stack/management/security/

## Issues Found
1. **Outdated AOF file path in the persistence verification step.** The post checked for a single flat file with `ls -la /var/lib/redis/appendonly.aof`. Since Redis 7.0 (and the official `packages.redis.io` repository ships Redis 7.x/8.x, which this guide uses), AOF uses a multi-part layout stored in a directory (`appenddirname`, default `appendonlydir`) containing base, incremental, and manifest files. Updated the command to `ls -la /var/lib/redis/appendonlydir/` with an explanatory comment so it reflects the actual on-disk layout.

2. **Infinite loop in the backup script's "wait for BGSAVE" logic.** The original loop was `while [ $(redis-cli ... LASTSAVE) == $(redis-cli ... LASTSAVE) ]` — it compared two freshly-issued `LASTSAVE` calls against each other, which are essentially always equal, so the loop would never exit (and never actually detect save completion). Fixed it to capture `LASTSAVE` into `LAST_SAVE` *before* triggering `BGSAVE`, then loop while the current `LASTSAVE` still equals the captured value, which is the correct way to wait for the background save to finish. Also quoted the comparison operands for safety and switched the string comparison to POSIX `=`.

3. **Outdated AOF backup in the backup script.** The script copied a single `$REDIS_DIR/appendonly.aof` file, which does not exist under the Redis 7.0+ multi-part AOF layout. Changed it to archive the entire `appendonlydir/` directory with `tar -czf` when present. The existing retention cleanup (`find ... -name "*.gz" -delete`) still applies to the resulting `.tar.gz` archive.

## Review Notes
- The official Redis APT repository setup (GPG key, signed-by sources line, `apt install redis`) is current and correct.
- Core `redis.conf` directives used throughout (bind, protected-mode, save, appendonly, appendfsync, maxmemory, maxmemory-policy, io-threads, io-threads-do-reads, lazyfree-*, active-defrag-*, tls-*, cluster-*) are all valid and accurate for current Redis.
- The Sentinel and Cluster configuration directives and `redis-cli --cluster` subcommands (create, check, add-node, reshard, rebalance, del-node, fix) are correct.
- Minor, left as-is (not technical errors):
  - The cluster architecture note says a cluster "Requires a minimum of 6 nodes (3 masters + 3 replicas)." Strictly, Redis Cluster requires a minimum of 3 master nodes; 6 nodes (3 masters + 3 replicas) is the *recommended* minimum for high availability, which is appropriate for a production guide.
  - The example `openssl rand -base64 48` output is illustrative/fabricated; 48 bytes encodes to 64 characters with no padding, so the trailing `=` in the sample string is cosmetic only.
  - `redis-cli LATENCY HISTORY command` uses `command` as a placeholder for an actual latency event name (e.g. `command`, `fork`); it is a literal example rather than a generic token, which is slightly ambiguous but not incorrect.
  - The redis-py Sentinel client uses `slave_for()`; this remains supported in current redis-py, though `master_for`/`slave_for` terminology predates the master/replica rename.
  - THP persistence via appending to `/etc/rc.local` assumes `rc.local` is executable/enabled, which is not guaranteed by default on modern Ubuntu; a systemd unit is generally more reliable. Functional but worth noting.

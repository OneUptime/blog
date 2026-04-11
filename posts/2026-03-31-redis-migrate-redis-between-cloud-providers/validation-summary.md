# Validation Summary: How to Migrate Redis Between Cloud Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (CLI, replication, RDB persistence)
- AWS ElastiCache (snapshot export via AWS CLI)
- Google Cloud Memorystore
- WireGuard (cross-cloud VPN tunneling)
- redis-shake (Alibaba's Redis migration tool)
- gsutil / gcloud storage (cross-cloud file transfer)
- Python redis-py client library

## Sources Consulted
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis INFO command reference: https://redis.io/docs/latest/commands/info/
- Redis REPLICAOF command reference: https://redis.io/docs/latest/commands/replicaof/
- Redis persistence (RDB) documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- AWS ElastiCache CLI reference for create-snapshot: https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-snapshot.html
- WireGuard documentation: https://www.wireguard.com/quickstart/
- redis-shake GitHub repository: https://github.com/alibaba/RedisShake
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found
1. **Path inconsistency in RDB file transfer (Step 2 vs Step 3)**: The `rsync` command in Step 2 copied the RDB file directly to `/var/lib/redis/dump.rdb` on the GCP host, but Step 3 then ran `sudo cp /tmp/dump.rdb /var/lib/redis/dump.rdb` — copying from `/tmp/` instead. Fixed the rsync destination to `/tmp/dump.rdb` so it is consistent with Step 3, which properly handles file placement with correct ownership (`redis:redis`).

## Review Notes
- The `gsutil cp s3://... gs://...` command for cross-cloud transfer works but requires AWS credentials to be configured in gsutil's boto config (via `gsutil config -a`). Users unfamiliar with this may want to use a two-step approach: `aws s3 cp` then `gsutil cp`.
- The `redis-cli --scan --count 10` flag sets the COUNT hint per SCAN iteration (not a total limit), which is fine for the spot-check use case shown.
- The WireGuard configuration only shows the source (AWS) side; the target (GCP) side config would be the mirror. This is implied but not shown — acceptable for brevity.
- The `REPLICAOF` command (used for live replication) is available since Redis 5.0. The post does not specify a minimum Redis version, but the commands used are compatible with Redis 5.0+.
- Cross-cloud replication with managed services (ElastiCache, Memorystore) may have restrictions — ElastiCache doesn't expose raw Redis replication externally. The post implicitly assumes self-managed Redis or compatible access, which is reasonable for the tutorial scope.

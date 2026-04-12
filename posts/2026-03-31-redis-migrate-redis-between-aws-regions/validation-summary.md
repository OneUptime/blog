# Validation Summary: How to Migrate Redis Between AWS Regions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (REPLICAOF, INFO replication, DBSIZE, RANDOMKEY, PING)
- AWS ElastiCache (Global Datastore, snapshots, replication groups)
- AWS CLI (elasticache, ec2 commands)
- AWS VPC Peering (cross-region networking)
- Python redis-py client library

## Sources Consulted
- AWS CLI Reference: create-global-replication-group — https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-global-replication-group.html
- AWS CLI Reference: create-replication-group — https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
- AWS CLI Reference: describe-global-replication-groups — https://docs.aws.amazon.com/cli/latest/reference/elasticache/describe-global-replication-groups.html
- AWS CLI Reference: failover-global-replication-group — https://docs.aws.amazon.com/cli/latest/reference/elasticache/failover-global-replication-group.html
- AWS CLI Reference: copy-snapshot — https://docs.aws.amazon.com/cli/latest/reference/elasticache/copy-snapshot.html
- AWS CLI Reference: create-snapshot — https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-snapshot.html
- CopySnapshot API Reference — https://docs.aws.amazon.com/AmazonElastiCache/latest/APIReference/API_CopySnapshot.html
- ElastiCache Copying Backups docs — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups-copying.html
- ElastiCache Exporting Backups docs — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups-exporting.html
- Redis REPLICAOF command — https://redis.io/docs/latest/commands/replicaof/
- Redis INFO command — https://redis.io/docs/latest/commands/info/
- Redis DEBUG command — https://redis.io/docs/latest/commands/debug/
- Redis PING command — https://redis.io/docs/latest/commands/ping/
- redis-py SSL documentation — https://redis.readthedocs.io/en/stable/examples/ssl_connection_examples.html
- AWS CLI Reference: create-vpc-peering-connection — https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-peering-connection.html
- AWS CLI Reference: accept-vpc-peering-connection — https://docs.aws.amazon.com/cli/latest/reference/ec2/accept-vpc-peering-connection.html

## Issues Found

### Issue 1: Incorrect parameters on `elasticache copy-snapshot` (Option 2, Step 2)
- **What was wrong:** The `copy-snapshot` command included `--source-region us-east-1` and `--target-bucket my-s3-bucket`. The `--source-region` parameter does not exist on the `elasticache copy-snapshot` command. The `--target-bucket` parameter is only used for exporting a snapshot to S3, not for cross-region snapshot copying.
- **What was changed:** Removed both `--source-region us-east-1` and `--target-bucket my-s3-bucket`. The correct approach for cross-region snapshot copy is to run `copy-snapshot` with `--region us-west-2` (the target region), specifying just the source and target snapshot names.
- **Why:** These parameters would cause CLI errors or unintended behavior (exporting to S3 instead of copying the snapshot cross-region).

### Issue 2: `DEBUG SLEEP 0` used as a ping test (Validate After Migration)
- **What was wrong:** `redis-cli -h <target-host> DEBUG SLEEP 0` was used and labeled as a "ping test". The `DEBUG` command is classified as `@admin`, `@slow`, and `@dangerous` in Redis ACL categories. It is often disabled in managed Redis environments (e.g., AWS ElastiCache) and is semantically incorrect for connectivity testing.
- **What was changed:** Replaced with `redis-cli -h <target-host> PING`, which is the purpose-built Redis connectivity test command.
- **Why:** `PING` is universally available, lightweight, and the standard way to verify Redis server reachability. `DEBUG SLEEP` is designed to simulate an unresponsive server, not test connectivity.

## Review Notes
- The `create-global-replication-group` command uses `--global-replication-group-id-suffix`. AWS automatically prepends a region-specific prefix (e.g., `ldgnf-`) to form the full global replication group ID. Subsequent commands referencing the group must use the full prefixed ID, not just the suffix. The blog simplifies this, which is acceptable for a guide but readers should be aware.
- The `--region` flag used on `accept-vpc-peering-connection` is a global AWS CLI flag, not specific to this command. This is technically correct usage but readers new to AWS CLI may not realize this distinction.
- The `INFO replication` field `master_link_status` only appears on replica nodes. Running the grep command on a primary will only return the `role` field, which is fine but could be mentioned for clarity.
- All Redis commands use the modern `REPLICAOF` syntax (introduced in Redis 5.0), which is correct and preferred over the deprecated `SLAVEOF`.

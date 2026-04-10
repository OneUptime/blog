# Validation Summary: How to Set Up Redis Cross-Region Failover

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (REPLICAOF, INFO replication)
- AWS ElastiCache Global Datastore
- AWS Route 53 (health checks, failover routing)
- Python redis-py client library
- AWS CLI (elasticache, route53)

## Sources Consulted
- AWS CLI `elasticache create-global-replication-group` help output
- AWS CLI `elasticache create-replication-group` help output
- AWS CLI `elasticache failover-global-replication-group` help output
- AWS CLI `route53 create-health-check` help output
- AWS Route 53 documentation on health check requirements (public IP constraint)
- AWS ElastiCache Global Datastore documentation on failover behavior (manual-only cross-region failover)
- Redis documentation on REPLICAOF command and INFO replication output fields

## Issues Found

1. **Missing `--region` flag on secondary replication group creation**: The `aws elasticache create-replication-group` command for the secondary cluster did not include `--region us-west-2`. Without this, the cluster would be created in the user's default region rather than the intended secondary region. Added `--region us-west-2` to the command.

2. **Unused `Sentinel` import in Python code**: The code imported `from redis.sentinel import Sentinel` but never used it. This was misleading, as it suggested the example would use Redis Sentinel for failover. Removed the unused import.

3. **Private IP in Route 53 health check**: The health check used `10.0.1.50`, a private RFC 1918 IP address. Route 53 health checkers run from public AWS infrastructure and cannot reach private IPs. Changed to `203.0.113.50` (a documentation-reserved public IP from RFC 5737) and added a note explaining that Route 53 health checks require a public IP, with CloudWatch alarm-based health checks as the alternative for VPC-internal endpoints.

4. **Incorrect claim about automatic cross-region failover**: The post stated "AWS promotes the secondary automatically when it detects primary failure." This is incorrect — ElastiCache Global Datastore does NOT support automatic cross-region failover. Automatic failover (`--automatic-failover-enabled`) only applies within a single region (Multi-AZ). Cross-region failover must always be triggered manually via the CLI, Console, or API. Corrected the text to state that failover must be triggered manually.

## Review Notes
- The replication lag claim of "typically 1-2 seconds" is conservative. AWS documentation states ElastiCache Global Datastore cross-region replication is "typically less than 1 second." The claim is not wrong (it can vary), but readers should know sub-second lag is the typical case for the managed service.
- The Python fallback code pattern is simplistic — it only handles connection-time failures, not mid-operation failures. This is acceptable for a tutorial but readers building production systems should consider more robust patterns (e.g., circuit breakers or retry logic with endpoint switching).
- The monitoring section mentions `slave_repl_offset` which is valid in Redis 4.0+ but was renamed to `replica_repl_offset` in Redis 7.0. The post does not specify a Redis version, so this is acceptable but worth noting for readers on newer versions.

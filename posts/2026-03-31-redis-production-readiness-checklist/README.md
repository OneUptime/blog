# Redis Production Readiness Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Production, DevOps

Description: A comprehensive Redis production readiness checklist covering security, persistence, monitoring, networking, memory, and high availability configurations.

---

Before promoting a Redis instance to production, validate it against this checklist. Missing any of these items can lead to data loss, security breaches, or unexpected downtime.

## Security

```bash
# 1. Verify password is set
redis-cli CONFIG GET requirepass

# 2. Check bind address (should NOT be 0.0.0.0)
redis-cli CONFIG GET bind

# 3. Verify protected-mode is on
redis-cli CONFIG GET protected-mode

# 4. Check dangerous commands are disabled (rename-command is not available via CONFIG GET)
# Inspect redis.conf directly, or use ACLs in Redis 6+:
redis-cli ACL LIST
```

Security checklist:

```text
[ ] requirepass set with strong password (>= 20 chars)
[ ] bind set to internal IP, not 0.0.0.0
[ ] protected-mode yes
[ ] FLUSHALL command renamed or disabled
[ ] CONFIG command renamed or access restricted
[ ] DEBUG command disabled
[ ] TLS enabled for client connections
[ ] Redis port not publicly exposed
[ ] ACL users configured (Redis 6+)
```

## Persistence

```bash
# Verify persistence configuration
redis-cli CONFIG GET save
redis-cli CONFIG GET appendonly
redis-cli CONFIG GET appendfsync
redis-cli INFO persistence
```

```text
[ ] RDB saves configured (save 900 1, save 300 10)
[ ] AOF enabled (appendonly yes)
[ ] appendfsync set to everysec (balance of safety/performance)
[ ] Disk has adequate free space (>= 3x dataset size)
[ ] Backup and restore procedure documented and tested
[ ] redis-check-rdb run on backup files
```

## Memory

```bash
redis-cli CONFIG GET maxmemory
redis-cli CONFIG GET maxmemory-policy
redis-cli INFO memory
```

```text
[ ] maxmemory set (not unlimited in production)
[ ] maxmemory-policy chosen for your use case
[ ] Memory headroom >= 20% for peak loads
[ ] OOM killer disabled for Redis process
[ ] Transparent Huge Pages disabled on host
```

Disable THP on Linux:

```bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
```

## High Availability

```text
[ ] Sentinel or Cluster configured (single node is not HA)
[ ] Replication verified (INFO replication shows slaves connected)
[ ] Failover tested and documented
[ ] Client reconnect logic implemented
[ ] Health check endpoints configured
```

```bash
# Check replication status
redis-cli INFO replication
```

## Monitoring

```text
[ ] Prometheus/Grafana metrics configured
[ ] Alerts set for: high memory, high latency, down replicas
[ ] Slowlog threshold configured
[ ] Keyspace notifications configured if needed
[ ] Log rotation configured
```

```bash
redis-cli CONFIG SET slowlog-log-slower-than 10000
redis-cli CONFIG SET slowlog-max-len 128
```

## OS-Level Settings

```bash
# Check and set OS limits
ulimit -n  # should be >= 65536
sysctl vm.overcommit_memory  # should be 1
sysctl net.core.somaxconn  # should be >= 511
```

```bash
# Apply in /etc/sysctl.conf
echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
sysctl -p
```

## Final Validation

```bash
# Run full info dump and review
redis-cli INFO all > /tmp/redis-pre-prod-audit.txt

# Check for warnings
redis-cli INFO all | grep -i warn
redis-cli PING
redis-cli DBSIZE
```

## Summary

A production-ready Redis instance must have authentication and TLS enabled, persistence configured with AOF, memory limits set with an appropriate eviction policy, high availability through Sentinel or Cluster, and monitoring with alerts. Run this checklist before every production deployment and keep it version-controlled as a runbook artifact.

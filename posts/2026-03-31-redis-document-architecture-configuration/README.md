# How to Document Redis Architecture and Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Documentation, Architecture

Description: Learn how to document Redis architecture and configuration effectively, covering topology diagrams, configuration catalogs, and automated documentation generation.

---

Good Redis documentation helps your team understand the deployment, troubleshoot incidents faster, and onboard new engineers without tribal knowledge gaps. This guide covers what to document and how to keep it current.

## Architecture Documentation Components

A complete Redis architecture document should include:

```text
1. Topology overview (diagram + description)
2. Node inventory with roles and specs
3. Network connectivity map
4. Configuration reference (annotated redis.conf)
5. Client connection details
6. Backup and persistence strategy
7. Monitoring and alerting setup
8. Runbooks and escalation paths
```

## Node Inventory Template

```text
Redis Deployment Inventory - Updated: 2026-03-31

Node          | Role     | IP           | Port | RAM  | Version
--------------|----------|--------------|------|------|--------
redis-prod-1  | Primary  | 10.0.1.10    | 6379 | 16GB | 7.2.4
redis-prod-2  | Replica  | 10.0.1.11    | 6379 | 16GB | 7.2.4
redis-prod-3  | Replica  | 10.0.1.12    | 6379 | 16GB | 7.2.4
sentinel-1    | Sentinel | 10.0.1.20    | 26379| 1GB  | 7.2.4
sentinel-2    | Sentinel | 10.0.1.21    | 26379| 1GB  | 7.2.4
sentinel-3    | Sentinel | 10.0.1.22    | 26379| 1GB  | 7.2.4
```

## Automated Configuration Export

Generate a configuration snapshot for documentation:

```bash
#!/bin/bash
# export-redis-config-doc.sh
OUTPUT="/docs/redis/config-snapshot-$(date +%Y%m%d).md"

echo "# Redis Configuration Snapshot" > "$OUTPUT"
echo "Generated: $(date -u)" >> "$OUTPUT"
echo "Host: $(hostname)" >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "## Server Info" >> "$OUTPUT"
echo '```text' >> "$OUTPUT"
redis-cli INFO server | grep -E "redis_version:|redis_mode:|os:|arch_bits:|tcp_port:|uptime_in_days:" >> "$OUTPUT"
echo '```' >> "$OUTPUT"

echo "" >> "$OUTPUT"
echo "## Key Configuration Settings" >> "$OUTPUT"
echo '```text' >> "$OUTPUT"
redis-cli CONFIG GET maxmemory | paste - - >> "$OUTPUT"
redis-cli CONFIG GET maxmemory-policy | paste - - >> "$OUTPUT"
redis-cli CONFIG GET appendonly | paste - - >> "$OUTPUT"
redis-cli CONFIG GET save | paste - - >> "$OUTPUT"
redis-cli CONFIG GET maxclients | paste - - >> "$OUTPUT"
redis-cli CONFIG GET bind | paste - - >> "$OUTPUT"
echo '```' >> "$OUTPUT"

echo "Documentation saved to $OUTPUT"
```

## Annotated Configuration Template

```text
# redis.conf - Production Configuration
# Last Updated: 2026-03-31
# Owner: DevOps Team
# Change Ticket: RC-2026-038

# Network
# Bind only to internal interface for security
bind 10.0.1.10 127.0.0.1
port 6379

# Memory
# Set to 75% of 16GB host RAM; leave room for OS and fork overhead
maxmemory 12gb
# Use LRU for session data; volatile keys are sessions with TTL
maxmemory-policy volatile-lru

# Persistence
# AOF for durability; RDB for fast restores
appendonly yes
appendfsync everysec          # balance of durability and performance
save 3600 1                   # RDB hourly if any change
save 300 100                  # RDB every 5 min if 100+ changes

# Security
requirepass "stored-in-vault-not-here"
rename-command FLUSHALL ""    # disabled - too dangerous
rename-command CONFIG "CONFIG-INTERNAL-ONLY"
```

## Connection String Catalog

```text
# Redis Connection Strings
# Managed in Vault: secret/redis/production

Application     | Environment | Connection String
----------------|-------------|------------------------------------------
web-app         | production  | redis://redis-prod.internal:6379/0
worker-service  | production  | redis://redis-prod.internal:6379/1
session-store   | production  | redis://redis-prod.internal:6379/2
rate-limiter    | production  | redis://redis-prod.internal:6379/3
```

## Topology Diagram (ASCII)

```text
                    Application Layer
                    +---------------+
                    |   App Servers  |
                    +-------+-------+
                            |
                    +-------+-------+
                    |   Redis Client  |
                    | (auto-discovers |
                    |  via Sentinel)  |
                    +-------+-------+
                            |
      +-------------+------------------+-------------+
      |             |                  |             |
+-----+------+ +---+----------+ +-----+------+ +---+----------+
|redis-prod-1| | sentinel-1   | |redis-prod-2| |redis-prod-3  |
| (Primary)  | | sentinel-2   | | (Replica)  | | (Replica)    |
| 10.0.1.10  | | sentinel-3   | | 10.0.1.11  | | 10.0.1.12    |
+-----+------+ +--------------+ +-----+------+ +------+-------+
      |                               |                |
      +----------replication----------+                |
      |                                                |
      +-------------------replication------------------+
```

## Summary

Effective Redis documentation combines automated configuration snapshots, annotated config files explaining the "why" behind each setting, node inventory tables, and ASCII topology diagrams. Schedule weekly runs of your config export script and store everything in version control so documentation stays synchronized with your actual deployment.

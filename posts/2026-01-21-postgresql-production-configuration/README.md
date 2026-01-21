# How to Configure PostgreSQL for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Configuration, Performance, Production, Database, Tuning

Description: A comprehensive guide to configuring PostgreSQL for production environments, covering memory settings, connection management, WAL configuration, checkpoints, and performance tuning for various workloads.

---

Properly configuring PostgreSQL for production is critical for performance, reliability, and scalability. This guide covers all essential configuration parameters, explains their impact, and provides recommendations for different workload types.

## Prerequisites

- PostgreSQL 14+ installed
- Understanding of your workload characteristics
- Knowledge of available system resources (RAM, CPU, storage)

## Configuration File Location

PostgreSQL's main configuration file is `postgresql.conf`:

```bash
# Default locations
/etc/postgresql/16/main/postgresql.conf     # Debian/Ubuntu
/var/lib/pgsql/16/data/postgresql.conf      # RHEL/CentOS

# Find current config file
psql -c "SHOW config_file;"
```

To apply changes:

```bash
# Reload for most settings
sudo systemctl reload postgresql

# Restart required for some settings (shared_buffers, etc.)
sudo systemctl restart postgresql
```

## Memory Configuration

### shared_buffers

The most important memory setting - PostgreSQL's shared memory buffer pool.

```conf
# Recommendation: 25% of total RAM for dedicated database server
# For 16GB RAM server:
shared_buffers = 4GB

# For 64GB RAM server:
shared_buffers = 16GB

# Never exceed 40% of RAM
```

### effective_cache_size

Estimate of memory available for disk caching by the OS and PostgreSQL.

```conf
# Recommendation: 50-75% of total RAM
# For 16GB RAM server:
effective_cache_size = 12GB

# For 64GB RAM server:
effective_cache_size = 48GB
```

### work_mem

Memory for sort operations and hash tables per operation (not per connection).

```conf
# CAUTION: Can be multiplied by concurrent operations
# Start conservative and increase if needed
work_mem = 64MB

# For complex analytical queries:
work_mem = 256MB

# Calculate max potential usage:
# max_connections * work_mem * operations_per_query
```

### maintenance_work_mem

Memory for maintenance operations (VACUUM, CREATE INDEX, etc.).

```conf
# Recommendation: 5-10% of RAM, max 2GB
maintenance_work_mem = 1GB

# For systems with autovacuum:
autovacuum_work_mem = 512MB
```

### wal_buffers

Write-ahead log buffers in shared memory.

```conf
# Recommendation: ~3% of shared_buffers, max 64MB
# Usually auto-tuned, but can set explicitly:
wal_buffers = 64MB
```

### Complete Memory Configuration Example

For a 32GB RAM dedicated database server:

```conf
# Memory settings
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 128MB
maintenance_work_mem = 2GB
wal_buffers = 64MB

# Huge pages (Linux only - enable in OS first)
huge_pages = try
```

## Connection Settings

### max_connections

Maximum concurrent connections.

```conf
# Default is often too high
# Each connection uses ~5-10MB RAM
max_connections = 200

# With connection pooler (PgBouncer):
max_connections = 100

# Calculate based on:
# max_connections = (RAM_in_MB - shared_buffers_in_MB) / per_connection_memory
```

### Connection Timeouts

```conf
# TCP keepalive settings
tcp_keepalives_idle = 60
tcp_keepalives_interval = 10
tcp_keepalives_count = 6

# Statement timeout (0 = disabled)
statement_timeout = 0

# Lock wait timeout
lock_timeout = 0

# Idle session timeout (PostgreSQL 14+)
idle_session_timeout = 0

# Idle transaction timeout
idle_in_transaction_session_timeout = 30min
```

### Superuser Reserved Connections

```conf
# Reserve connections for admin access
superuser_reserved_connections = 3
```

## Write-Ahead Log (WAL) Configuration

### Basic WAL Settings

```conf
# WAL level (minimal, replica, logical)
wal_level = replica

# Maximum WAL size before checkpoint
max_wal_size = 4GB

# Minimum WAL size to maintain
min_wal_size = 1GB

# Number of WAL segments (16MB each)
wal_keep_size = 1GB
```

### WAL Performance

```conf
# Commit behavior
synchronous_commit = on        # Data safety (on/off/local/remote_write/remote_apply)
wal_sync_method = fdatasync    # Usually auto-detected

# Compression
wal_compression = on           # Reduces WAL size and I/O

# For high-write workloads on fast storage:
commit_delay = 10              # Microseconds
commit_siblings = 5            # Min concurrent transactions
```

### Archive and Replication

```conf
# Enable archiving
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'

# For streaming replication
max_wal_senders = 10
max_replication_slots = 10
```

## Checkpoint Configuration

### Checkpoint Settings

```conf
# Checkpoint frequency
checkpoint_timeout = 15min      # Max time between checkpoints

# Checkpoint completion target (spread I/O)
checkpoint_completion_target = 0.9

# Flush behavior
checkpoint_flush_after = 256kB

# Warning threshold
checkpoint_warning = 30s
```

### Background Writer

```conf
# Spread writes to reduce checkpoint spikes
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
bgwriter_lru_multiplier = 2.0
bgwriter_flush_after = 512kB
```

## Query Planner Settings

### Cost Parameters

```conf
# Sequential vs random I/O cost ratio
# For SSDs, lower random_page_cost
random_page_cost = 1.1          # SSDs (default 4.0 for HDDs)
seq_page_cost = 1.0

# Effective I/O concurrency (for SSDs)
effective_io_concurrency = 200  # SSDs (default 1 for HDDs)

# CPU cost parameters
cpu_tuple_cost = 0.01
cpu_index_tuple_cost = 0.005
cpu_operator_cost = 0.0025
```

### Parallelism

```conf
# Enable parallel queries
max_parallel_workers_per_gather = 4     # Per query
max_parallel_workers = 8                 # Total
max_parallel_maintenance_workers = 4     # For CREATE INDEX, etc.

# Thresholds for parallel execution
min_parallel_table_scan_size = 8MB
min_parallel_index_scan_size = 512kB
parallel_tuple_cost = 0.1
parallel_setup_cost = 1000.0
```

### Statistics and Planning

```conf
# Statistics targets
default_statistics_target = 100         # Default (10-10000)

# For tables with skewed data:
# ALTER TABLE mytable ALTER COLUMN mycolumn SET STATISTICS 1000;

# Enable extended statistics
# CREATE STATISTICS mystat ON col1, col2 FROM mytable;

# JIT compilation (PostgreSQL 11+)
jit = on
jit_above_cost = 100000
jit_inline_above_cost = 500000
jit_optimize_above_cost = 500000
```

## Autovacuum Configuration

### Basic Autovacuum Settings

```conf
# Enable autovacuum
autovacuum = on
autovacuum_max_workers = 3

# Frequency
autovacuum_naptime = 1min

# Thresholds
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.1      # 10% of table
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.05    # 5% of table

# Cost limiting (to reduce I/O impact)
autovacuum_vacuum_cost_delay = 2ms
autovacuum_vacuum_cost_limit = 1000
```

### Aggressive Autovacuum for Large Tables

For tables with millions of rows, lower scale factors:

```sql
-- Per-table settings
ALTER TABLE large_table SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005,
    autovacuum_vacuum_threshold = 1000
);
```

### Anti-Wraparound Settings

```conf
# Prevent transaction ID wraparound
autovacuum_freeze_max_age = 200000000
autovacuum_multixact_freeze_max_age = 400000000
vacuum_freeze_min_age = 50000000
vacuum_freeze_table_age = 150000000
```

## Logging Configuration

### Log Destination

```conf
# Log collector
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_truncate_on_rotation = off
```

### What to Log

```conf
# Connection logging
log_connections = on
log_disconnections = on

# Statement logging
log_statement = 'ddl'                    # none, ddl, mod, all

# Duration logging
log_min_duration_statement = 1000        # Log queries > 1 second
log_duration = off

# Error logging
log_min_messages = warning
log_min_error_statement = error

# Query details
log_line_prefix = '%m [%p] %q%u@%d '
log_lock_waits = on
log_temp_files = 0                       # Log all temp files

# Autovacuum logging
log_autovacuum_min_duration = 0          # Log all autovacuum
```

### CSV Logging for Analysis

```conf
log_destination = 'csvlog'
logging_collector = on
log_filename = 'postgresql-%Y-%m-%d.csv'
```

## Security Configuration

### Authentication

Configure in `pg_hba.conf`:

```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
host    all             all             10.0.0.0/8              scram-sha-256
host    replication     replicator      10.0.0.0/8              scram-sha-256
```

### Password Encryption

```conf
# Use strongest encryption
password_encryption = scram-sha-256
```

### SSL/TLS

```conf
ssl = on
ssl_cert_file = '/etc/postgresql/server.crt'
ssl_key_file = '/etc/postgresql/server.key'
ssl_ca_file = '/etc/postgresql/ca.crt'
ssl_min_protocol_version = 'TLSv1.2'
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
```

## Complete Production Configuration

### OLTP Workload (Web Applications)

For a 32GB RAM, 8 CPU core server with SSDs:

```conf
# Memory
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 64MB
maintenance_work_mem = 2GB
wal_buffers = 64MB
huge_pages = try

# Connections
max_connections = 200
superuser_reserved_connections = 3

# WAL
wal_level = replica
max_wal_size = 4GB
min_wal_size = 1GB
wal_compression = on
synchronous_commit = on

# Checkpoints
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9

# Background writer
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
bgwriter_lru_multiplier = 2.0

# Query planner
random_page_cost = 1.1
effective_io_concurrency = 200
default_statistics_target = 100

# Parallel queries
max_parallel_workers_per_gather = 2
max_parallel_workers = 8
max_parallel_maintenance_workers = 2

# Autovacuum
autovacuum = on
autovacuum_max_workers = 3
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05
autovacuum_vacuum_cost_delay = 2ms
autovacuum_vacuum_cost_limit = 1000

# Logging
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_min_duration_statement = 1000
log_checkpoints = on
log_lock_waits = on
log_temp_files = 0
log_autovacuum_min_duration = 0
log_line_prefix = '%m [%p] %q%u@%d '

# Security
ssl = on
password_encryption = scram-sha-256
```

### Analytics/OLAP Workload

For a 64GB RAM, 16 CPU core server:

```conf
# Memory - larger work_mem for complex queries
shared_buffers = 16GB
effective_cache_size = 48GB
work_mem = 512MB
maintenance_work_mem = 4GB
wal_buffers = 64MB

# Connections - fewer but heavier
max_connections = 50

# WAL - larger for bulk operations
max_wal_size = 16GB
min_wal_size = 4GB

# Checkpoints - less frequent
checkpoint_timeout = 30min
checkpoint_completion_target = 0.9

# Query planner - aggressive parallelism
random_page_cost = 1.1
effective_io_concurrency = 200
default_statistics_target = 500

# Parallel queries - max parallelism
max_parallel_workers_per_gather = 8
max_parallel_workers = 16
max_parallel_maintenance_workers = 4
parallel_tuple_cost = 0.01
parallel_setup_cost = 100

# JIT for complex queries
jit = on
jit_above_cost = 10000
jit_inline_above_cost = 50000

# Autovacuum - less aggressive
autovacuum_vacuum_cost_delay = 10ms
```

## Tuning Scripts and Tools

### Check Current Settings

```sql
-- Show non-default settings
SELECT name, setting, unit, context
FROM pg_settings
WHERE source != 'default'
ORDER BY name;

-- Check memory settings
SELECT name, setting, unit,
       pg_size_pretty(setting::bigint *
         CASE unit
           WHEN '8kB' THEN 8192
           WHEN 'kB' THEN 1024
           WHEN 'MB' THEN 1048576
           ELSE 1
         END) as pretty_value
FROM pg_settings
WHERE name IN ('shared_buffers', 'work_mem', 'maintenance_work_mem',
               'effective_cache_size', 'wal_buffers');
```

### PgTune

Use PgTune for initial recommendations:

```bash
# Install pgtune
pip install pgtune

# Generate configuration
pgtune -i /etc/postgresql/16/main/postgresql.conf -o postgresql.conf.tuned \
  --type=web \
  --memory=32GB \
  --connections=200 \
  --storage-type=ssd
```

### postgresqltuner

```bash
# Run PostgreSQL tuner
git clone https://github.com/jfcoz/postgresqltuner.git
cd postgresqltuner
perl postgresqltuner.pl --host=localhost --user=postgres --password=secret
```

## Monitoring Configuration Effectiveness

### Key Metrics to Watch

```sql
-- Buffer hit ratio (should be > 99%)
SELECT
    sum(blks_hit) * 100.0 / sum(blks_hit + blks_read) as buffer_hit_ratio
FROM pg_stat_database;

-- Cache hit ratio per table
SELECT
    relname,
    heap_blks_hit * 100.0 / nullif(heap_blks_hit + heap_blks_read, 0) as hit_ratio
FROM pg_statio_user_tables
WHERE heap_blks_read > 0
ORDER BY hit_ratio;

-- Checkpoint statistics
SELECT * FROM pg_stat_bgwriter;

-- Connection usage
SELECT
    count(*) as total_connections,
    count(*) filter (where state = 'active') as active,
    count(*) filter (where state = 'idle') as idle,
    count(*) filter (where state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity;

-- Wait events
SELECT wait_event_type, wait_event, count(*)
FROM pg_stat_activity
WHERE wait_event IS NOT NULL
GROUP BY wait_event_type, wait_event
ORDER BY count(*) DESC;
```

## Conclusion

Proper PostgreSQL configuration is essential for production performance. Key takeaways:

1. **Memory**: Set shared_buffers to 25% RAM, effective_cache_size to 75%
2. **Connections**: Use connection pooling, don't over-provision max_connections
3. **WAL**: Size appropriately for your write volume
4. **Autovacuum**: Keep enabled and tuned for your table sizes
5. **Logging**: Enable slow query logging for optimization
6. **Monitor**: Continuously monitor and adjust based on metrics

Start with these recommendations and tune based on your specific workload characteristics and monitoring data. Regular performance reviews ensure your configuration remains optimal as your data and usage patterns evolve.

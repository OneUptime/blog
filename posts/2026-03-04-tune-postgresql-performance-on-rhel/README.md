# How to Tune PostgreSQL Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, Performance Tuning, Database, Optimization

Description: Tune key PostgreSQL configuration parameters on RHEL for better query performance, memory utilization, and I/O throughput based on your system's hardware.

---

Default PostgreSQL settings are intentionally conservative to run on minimal hardware. For production on RHEL, you should tune several parameters based on your server's RAM, CPU, and storage type.

## Key Memory Parameters

```bash
# Edit postgresql.conf
sudo vi /var/lib/pgsql/data/postgresql.conf
```

```bash
# shared_buffers: Main memory cache for PostgreSQL
# Set to 25% of total RAM (do not exceed 8GB on most systems)
# For a server with 16GB RAM:
shared_buffers = 4GB

# effective_cache_size: Estimate of OS cache available for queries
# Set to 75% of total RAM
effective_cache_size = 12GB

# work_mem: Memory per sort/hash operation per query
# Be careful - each query can use multiple work_mem allocations
# Start with 64MB for OLTP, higher for analytics
work_mem = 64MB

# maintenance_work_mem: Memory for maintenance operations (VACUUM, CREATE INDEX)
# Set to 512MB-1GB on production servers
maintenance_work_mem = 512MB
```

## WAL and Checkpoint Settings

```bash
# wal_buffers: Memory for WAL data before writing to disk
# Set to 64MB for busy servers
wal_buffers = 64MB

# checkpoint_completion_target: Spread checkpoint I/O over time
# Higher value = more spread = less I/O spikes
checkpoint_completion_target = 0.9

# max_wal_size: Maximum WAL size between checkpoints
# Higher = fewer checkpoints = better write performance
max_wal_size = 2GB

# min_wal_size: Minimum WAL size to retain
min_wal_size = 512MB
```

## Connection and Query Settings

```bash
# max_connections: Tune based on actual concurrent needs
# Use connection pooling (pgbouncer/pgpool) if you need many connections
max_connections = 200

# random_page_cost: Lower for SSD storage (default 4.0 is for spinning disks)
# For SSD:
random_page_cost = 1.1

# effective_io_concurrency: Higher for SSD
# For SSD (NVMe):
effective_io_concurrency = 200

# For spinning disks:
# effective_io_concurrency = 2
```

## Parallel Query Settings

```bash
# Enable parallel query execution
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_worker_processes = 8
parallel_tuple_cost = 0.01
parallel_setup_cost = 500
```

## Autovacuum Tuning

```bash
# Make autovacuum more aggressive for busy databases
autovacuum_max_workers = 4
autovacuum_naptime = 30s
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
autovacuum_vacuum_scale_factor = 0.05
autovacuum_analyze_scale_factor = 0.025
autovacuum_vacuum_cost_limit = 1000
```

## Apply and Verify Changes

```bash
# Restart PostgreSQL to apply shared_buffers changes
sudo systemctl restart postgresql

# Most other settings can be reloaded without restart
sudo -u postgres psql -c "SELECT pg_reload_conf();"

# Verify settings
sudo -u postgres psql -c "SHOW shared_buffers;"
sudo -u postgres psql -c "SHOW effective_cache_size;"
sudo -u postgres psql -c "SHOW work_mem;"
```

## Identify Slow Queries

```bash
# Enable the pg_stat_statements extension
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# Add to postgresql.conf:
# shared_preload_libraries = 'pg_stat_statements'

# After restart, find the slowest queries
sudo -u postgres psql -c "
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"
```

## Kernel Tuning for PostgreSQL

```bash
# Increase shared memory limits
sudo tee /etc/sysctl.d/postgresql.conf << 'EOF'
# Allow large shared memory segments
kernel.shmmax = 8589934592
kernel.shmall = 2097152

# Reduce swappiness
vm.swappiness = 10

# Increase dirty page limits for write-heavy workloads
vm.dirty_ratio = 40
vm.dirty_background_ratio = 10
EOF

sudo sysctl --system
```

Start with these settings, monitor with `pg_stat_statements` and `pg_stat_user_tables`, then adjust based on your actual workload patterns.

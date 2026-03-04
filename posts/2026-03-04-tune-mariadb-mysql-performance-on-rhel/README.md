# How to Tune MariaDB/MySQL Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, MySQL, Performance Tuning, InnoDB, Database

Description: Optimize MariaDB and MySQL performance on RHEL by tuning InnoDB buffer pool, query cache, connection settings, and identifying slow queries.

---

Default MariaDB/MySQL configurations are designed for minimal resource usage. Production workloads on RHEL benefit from tuning the InnoDB engine, connection handling, and query logging to match your hardware and traffic patterns.

## InnoDB Buffer Pool

The buffer pool is the most important setting. It caches data and index pages in memory.

```bash
# Edit /etc/my.cnf.d/server.cnf or create a new file
sudo tee /etc/my.cnf.d/performance.cnf << 'EOF'
[mysqld]
# Set to 70-80% of available RAM on a dedicated database server
# For a 16GB server:
innodb_buffer_pool_size = 12G

# Split the buffer pool into instances (one per GB, max 64)
innodb_buffer_pool_instances = 12

# InnoDB log file size - larger means better write performance
# but longer crash recovery
innodb_log_file_size = 512M

# Number of InnoDB log files
innodb_log_files_in_group = 2

# Flush method - O_DIRECT avoids double buffering with OS cache
innodb_flush_method = O_DIRECT

# Write durability (1 = safest, 2 = faster, 0 = fastest but risky)
innodb_flush_log_at_trx_commit = 1

# I/O capacity - increase for SSD (default 200)
innodb_io_capacity = 2000
innodb_io_capacity_max = 4000
EOF
```

## Connection and Thread Settings

```bash
# Add to /etc/my.cnf.d/performance.cnf
sudo tee -a /etc/my.cnf.d/performance.cnf << 'EOF'

# Maximum concurrent connections
max_connections = 200

# Thread cache - reduce overhead of creating new threads
thread_cache_size = 50

# Table open cache
table_open_cache = 4000
table_open_cache_instances = 16

# Per-connection memory settings (be conservative - multiplied by connections)
sort_buffer_size = 4M
join_buffer_size = 4M
read_buffer_size = 2M
read_rnd_buffer_size = 8M

# Temporary table sizes
tmp_table_size = 64M
max_heap_table_size = 64M
EOF
```

## Enable Slow Query Log

```bash
# Add to /etc/my.cnf.d/performance.cnf
sudo tee -a /etc/my.cnf.d/performance.cnf << 'EOF'

# Slow query logging
slow_query_log = 1
slow_query_log_file = /var/log/mariadb/slow-query.log
long_query_time = 1
log_queries_not_using_indexes = 1
EOF

# Create log directory
sudo mkdir -p /var/log/mariadb
sudo chown mysql:mysql /var/log/mariadb

# Restart MariaDB
sudo systemctl restart mariadb
```

## Analyze Slow Queries

```bash
# Use mysqldumpslow to analyze the slow query log
sudo mysqldumpslow -s t /var/log/mariadb/slow-query.log | head -30

# Show the top 10 slowest queries sorted by total time
sudo mysqldumpslow -s t -t 10 /var/log/mariadb/slow-query.log
```

## Check Current Buffer Pool Usage

```bash
mysql -u root -p -e "
SHOW ENGINE INNODB STATUS\G" | grep -A 5 "BUFFER POOL AND MEMORY"

# Check buffer pool hit ratio
mysql -u root -p -e "
SELECT
    (1 - (Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests)) * 100
    AS hit_ratio
FROM (
    SELECT
        VARIABLE_VALUE AS Innodb_buffer_pool_reads
    FROM information_schema.GLOBAL_STATUS
    WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads'
) AS reads,
(
    SELECT
        VARIABLE_VALUE AS Innodb_buffer_pool_read_requests
    FROM information_schema.GLOBAL_STATUS
    WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests'
) AS requests;
"
# Aim for 99%+ hit ratio
```

## Kernel Tuning

```bash
sudo tee /etc/sysctl.d/mariadb.conf << 'EOF'
# Reduce swappiness so MariaDB stays in RAM
vm.swappiness = 10

# Increase file descriptor limits
fs.file-max = 65536
EOF

sudo sysctl --system

# Set ulimits for the mysql user
sudo tee /etc/security/limits.d/mysql.conf << 'EOF'
mysql soft nofile 65536
mysql hard nofile 65536
EOF
```

## Apply and Verify

```bash
# Restart MariaDB
sudo systemctl restart mariadb

# Verify the key settings
mysql -u root -p -e "
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
SHOW VARIABLES LIKE 'innodb_flush_method';
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'slow_query_log';
"
```

Monitor the buffer pool hit ratio and slow query log regularly. Most performance gains come from having the right buffer pool size and proper indexing on your tables.

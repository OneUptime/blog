# How to Fix PostgreSQL OOM Killer Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, OOM Killer, Memory, Linux, Troubleshooting

Description: A guide to preventing Linux OOM killer from terminating PostgreSQL processes, covering memory configuration and system tuning.

---

The Linux OOM (Out of Memory) killer can terminate PostgreSQL processes, causing crashes. This guide covers prevention and configuration.

## Detecting OOM Kills

```bash
# Check system logs
dmesg | grep -i "out of memory"
journalctl | grep -i "oom"

# Check PostgreSQL logs
grep -i "server process.*was terminated" /var/log/postgresql/*.log
```

## Prevention Strategies

### Protect PostgreSQL from OOM

```bash
# Set OOM score adjustment for PostgreSQL
echo -1000 > /proc/$(pgrep -f "postgres:.*main")/oom_score_adj

# Permanent via systemd
# /etc/systemd/system/postgresql.service.d/oom.conf
[Service]
OOMScoreAdjust=-1000
```

### Configure PostgreSQL Memory

```conf
# postgresql.conf - Conservative memory settings
shared_buffers = 2GB          # 25% of RAM max
work_mem = 64MB               # Per-operation memory
maintenance_work_mem = 512MB
effective_cache_size = 6GB    # For planner, not allocation

# Limit connections (each uses ~10MB)
max_connections = 100
```

### Memory Calculation

```
Total PostgreSQL memory =
    shared_buffers +
    (max_connections * work_mem * 2) +
    (autovacuum_max_workers * maintenance_work_mem)

Example:
2GB + (100 * 64MB * 2) + (3 * 512MB) = 2GB + 12.8GB + 1.5GB = 16.3GB
```

## System Configuration

### Overcommit Settings

```bash
# Disable memory overcommit
echo 2 > /proc/sys/vm/overcommit_memory
echo 80 > /proc/sys/vm/overcommit_ratio

# Permanent
echo "vm.overcommit_memory = 2" >> /etc/sysctl.conf
echo "vm.overcommit_ratio = 80" >> /etc/sysctl.conf
sysctl -p
```

### Swap Configuration

```bash
# Check swap
free -h

# Add swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Monitoring Memory

```sql
-- PostgreSQL memory usage
SELECT
    pg_size_pretty(pg_database_size(current_database())) as db_size,
    pg_size_pretty(sum(pg_total_relation_size(oid))) as total_size
FROM pg_class WHERE relkind = 'r';
```

```bash
# System memory
free -h
vmstat 1 5
```

## Best Practices

1. **Size memory conservatively** - Leave headroom
2. **Use connection pooling** - Reduce connection count
3. **Protect PostgreSQL** - OOM score adjustment
4. **Monitor memory** - Alert before OOM
5. **Add swap** - Safety buffer
6. **Disable overcommit** - More predictable behavior

## Conclusion

Prevent OOM kills by configuring PostgreSQL memory conservatively, protecting processes with OOM score adjustments, and monitoring system memory.

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
journalctl -k --grep='out of memory|oom-killer|Killed process' --case-sensitive=no

# Check PostgreSQL logs
grep -i "server process.*was terminated" /var/log/postgresql/*.log
```

## Prevention Strategies

### Protect PostgreSQL from OOM

```bash
# Set OOM score adjustment for running PostgreSQL processes
for pid in $(pgrep -u postgres -x postgres); do
    echo -1000 | sudo tee /proc/$pid/oom_score_adj
done

# Permanent via systemd
# Use the active PostgreSQL service name on your system.
sudo install -d /etc/systemd/system/postgresql.service.d
printf "[Service]\nOOMScoreAdjust=-1000\n" | sudo tee /etc/systemd/system/postgresql.service.d/oom.conf
sudo systemctl daemon-reload
sudo systemctl restart postgresql
```

### Configure PostgreSQL Memory

```conf
# postgresql.conf - Conservative memory settings
shared_buffers = 2GB          # 25% of RAM max
work_mem = 64MB               # Per-operation memory
maintenance_work_mem = 512MB
effective_cache_size = 6GB    # For planner, not allocation

# Limit connections; each backend has its own memory overhead
max_connections = 100
```

### Memory Calculation

```text
Worst-case PostgreSQL memory estimate =
    shared_buffers +
    (active_connections * work_mem * active_operations_per_query) +
    (autovacuum_max_workers * autovacuum_work_mem or maintenance_work_mem)

Example:
2GB + (100 * 64MB * 2) + (3 * 512MB) = about 16GB
```

## System Configuration

### Overcommit Settings

```bash
# Use strict memory overcommit accounting
echo 2 | sudo tee /proc/sys/vm/overcommit_memory
echo 80 | sudo tee /proc/sys/vm/overcommit_ratio

# Permanent
printf "vm.overcommit_memory = 2\nvm.overcommit_ratio = 80\n" | sudo tee /etc/sysctl.d/99-postgresql-memory.conf
sudo sysctl --system
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
-- Current backend memory context usage
SELECT
    pg_size_pretty(sum(total_bytes)) AS total_allocated,
    pg_size_pretty(sum(used_bytes)) AS total_used
FROM pg_backend_memory_contexts;

-- Log memory contexts for a specific backend
SELECT pg_log_backend_memory_contexts(pid)
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
LIMIT 1;
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
